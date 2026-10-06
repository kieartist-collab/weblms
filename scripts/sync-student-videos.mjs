import { writeFile } from 'node:fs/promises';

const url = 'https://www.youtube.com/playlist?list=PLfwK-27X-RuFFsTEliY6_Xd2m8uXePQA3';
const response = await fetch(url);
if (!response.ok) throw new Error(`Playlist HTTP ${response.status}`);
const html = await response.text();
const initial = html.match(/var ytInitialData = (.*?);<\/script>/s);
if (!initial) throw new Error('YouTube playlist format changed; existing list preserved.');
const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
const videos = new Map();
function playerData(html) {
  const marker = 'var ytInitialPlayerResponse = ';
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const json = html.slice(start + marker.length);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(json.slice(0, i + 1));
  }
  return null;
}
function extract(root) {
  let token;
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    const modern = value.lockupViewModel;
    const legacy = value.playlistVideoRenderer;
    const title =
      modern?.metadata?.lockupMetadataViewModel?.title?.content ??
      legacy?.title?.runs?.map((r) => r.text).join('');
    const source = modern?.contentImage?.thumbnailViewModel?.image?.sources?.at(-1)?.url;
    const id = legacy?.videoId ?? source?.match(/\/vi\/([\w-]{11})\//)?.[1];
    if (id && title && /^[\w-]{11}$/.test(id))
      videos.set(id, { id, title, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
    if (value.continuationCommand?.token) token = value.continuationCommand.token;
    for (const child of Object.values(value)) if (typeof child === 'object') walk(child);
  }
  walk(root);
  return token;
}
let token = extract(JSON.parse(initial[1]).contents);
const seen = new Set();
while (token) {
  if (!version || seen.has(token) || seen.size >= 100)
    throw new Error('Incomplete pagination; existing list preserved.');
  seen.add(token);
  const next = await fetch('https://www.youtube.com/youtubei/v1/browse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: version } },
      continuation: token,
    }),
  });
  if (!next.ok) throw new Error(`Continuation HTTP ${next.status}`);
  const data = await next.json();
  if (data.error || !data.responseContext)
    throw new Error('Unexpected continuation response; existing list preserved.');
  // YouTube may return only responseContext/trackingParams for the terminal cursor.
  token = extract(data.onResponseReceivedActions ?? data.onResponseReceivedEndpoints);
}
if (!videos.size) throw new Error('No public videos; existing list preserved.');
const queue = [...videos.values()];
let cursor = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < queue.length) {
      const video = queue[cursor++];
      let page;
      for (let attempt = 0; attempt < 3; attempt++) {
        page = await fetch(`https://www.youtube.com/watch?v=${video.id}`, {
          signal: AbortSignal.timeout(20000),
        });
        if (page.ok) break;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
      if (!page.ok) throw new Error(`Video HTTP ${page.status}; existing list preserved.`);
      const body = await page.text();
      const details = playerData(body)?.videoDetails;
      if (!details) throw new Error(`Missing video details: ${video.id}; existing list preserved.`);
      video.title = details.title;
      video.description = details.shortDescription || '';
      video.thumbnail = details.thumbnail?.thumbnails?.at(-1)?.url || video.thumbnail;
      video.duration = Number(details.lengthSeconds) || 0;
      video.author = details.author || '';
    }
  }),
);
await writeFile(
  new URL('../src/student-videos.json', import.meta.url),
  JSON.stringify([...videos.values()], null, 2) + '\n',
);
console.log(`Synced ${videos.size} public videos (${seen.size + 1} pages).`);

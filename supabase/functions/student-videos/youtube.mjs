export async function loadVideos(key, playlistIds, request = fetch) {
  async function api(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    url.search = new URLSearchParams({ ...params, key }).toString();
    const response = await request(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`YouTube HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('Invalid YouTube response');
    return data;
  }
  const ids = new Set();
  for (const playlistId of playlistIds) {
    let pageToken = '';
    const seen = new Set();
    do {
      if (seen.has(pageToken) || seen.size >= 100) throw new Error('Incomplete playlist');
      seen.add(pageToken);
      const page = await api('playlistItems', {
        part: 'contentDetails',
        playlistId,
        maxResults: '50',
        pageToken,
      });
      page.items.forEach((item) => {
        const id = item.contentDetails?.videoId;
        if (/^[\w-]{11}$/.test(id ?? '')) ids.add(id);
      });
      pageToken = page.nextPageToken || '';
    } while (pageToken);
  }
  const videos = [];
  const allIds = [...ids];
  for (let i = 0; i < allIds.length; i += 50) {
    const page = await api('videos', {
      part: 'snippet,contentDetails,status',
      id: allIds.slice(i, i + 50).join(','),
    });
    for (const item of page.items) {
      if (item.status?.privacyStatus !== 'public' || item.status?.embeddable === false) continue;
      const s = item.snippet;
      const time = item.contentDetails?.duration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      videos.push({
        id: item.id,
        title: s.title,
        description: s.description || '',
        author: s.channelTitle || '',
        thumbnail:
          s.thumbnails?.maxres?.url ||
          s.thumbnails?.high?.url ||
          `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        duration: time
          ? Number(time[1] || 0) * 3600 + Number(time[2] || 0) * 60 + Number(time[3] || 0)
          : 0,
        publishedAt: s.publishedAt,
      });
    }
  }
  if (!videos.length) throw new Error('No public videos; preserving previous collection');
  return videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadVideos } from '../supabase/functions/student-videos/youtube.mjs';

test('preserves manual playlist order across pages even when video details arrive in reverse order', async () => {
  const calls = [];
  const request = async (url) => {
    calls.push(url);
    const items = url.pathname.endsWith('playlistItems')
      ? url.searchParams.get('pageToken')
        ? { items: [{ contentDetails: { videoId: 'bbbbbbbbbbb' } }] }
        : { items: [{ contentDetails: { videoId: 'aaaaaaaaaaa' } }], nextPageToken: 'next' }
      : {
          items: [
            {
              id: 'bbbbbbbbbbb',
              snippet: { title: 'New', publishedAt: '2026-01-01' },
              contentDetails: { duration: 'PT35S' },
              status: { privacyStatus: 'public' },
            },
            {
              id: 'aaaaaaaaaaa',
              snippet: { title: 'Old', publishedAt: '2025-01-01' },
              contentDetails: { duration: 'PT1H2M3S' },
              status: { privacyStatus: 'public' },
            },
            { id: 'ccccccccccc', status: { privacyStatus: 'private' } },
            { id: 'ddddddddddd', status: { privacyStatus: 'public', embeddable: false } },
          ],
        };
    return { ok: true, json: async () => items };
  };
  const videos = await loadVideos('secret', ['one', 'two'], request);
  assert.deepEqual(
    videos.map((v) => v.title),
    ['Old', 'New'],
  );
  assert.equal(videos[0].duration, 3723);
  assert.equal(calls.length, 5);
  assert.equal(calls.at(-1).searchParams.get('id'), 'aaaaaaaaaaa,bbbbbbbbbbb');
});

test('rejects incomplete sync and empty playlists so cache is preserved', async () => {
  await assert.rejects(
    loadVideos('key', ['one'], async () => ({ ok: false, status: 403 })),
    /403/,
  );
  await assert.rejects(
    loadVideos('key', ['one'], async () => ({ ok: true, json: async () => ({ items: [] }) })),
    /No public videos/,
  );
  await assert.rejects(
    loadVideos('key', ['one'], async () => ({
      ok: true,
      json: async () => ({ items: [], nextPageToken: 'repeat' }),
    })),
    /Incomplete playlist/,
  );
});

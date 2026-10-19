import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { loadVideos } from './youtube.mjs';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: cache, error } = await db
      .from('student_video_cache')
      .select('*')
      .eq('id', true)
      .single();
    if (error) throw error;
    const now = new Date().toISOString();
    if (cache.refresh_after <= now) {
      // Atomic lease prevents simultaneous visitors from exhausting YouTube quota.
      const { data: lease, error: leaseError } = await db
        .from('student_video_cache')
        .update({ refresh_after: new Date(Date.now() + 5 * 60000).toISOString() })
        .eq('id', true)
        .lte('refresh_after', now)
        .select('id');
      if (leaseError) throw leaseError;
      if (lease?.length) {
        try {
          const key = Deno.env.get('YOUTUBE_API_KEY');
          if (!key) throw new Error('Missing YOUTUBE_API_KEY');
          const playlists = (
            Deno.env.get('YOUTUBE_STUDENT_PLAYLIST_IDS') || 'PLfwK-27X-RuFFsTEliY6_Xd2m8uXePQA3'
          )
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          const videos = await loadVideos(key, playlists);
          const updatedAt = new Date().toISOString();
          const { error: writeError } = await db
            .from('student_video_cache')
            .update({
              videos,
              updated_at: updatedAt,
              refresh_after: new Date(Date.now() + 15 * 60000).toISOString(),
            })
            .eq('id', true);
          if (writeError) throw writeError;
          return json({ videos, updatedAt });
        } catch {
          console.error('Student playlist refresh failed; previous collection preserved.');
        }
      }
    }
    if (!cache.videos.length) return json({ error: 'Collection not ready' }, 503);
    return json({ videos: cache.videos, updatedAt: cache.updated_at });
  } catch {
    return json({ error: 'Collection unavailable' }, 503);
  }
});

import { useEffect, useState } from 'react';
import fallback from './student-videos.json';

export type StudentVideo = (typeof fallback)[number];
export const studentPlaylist =
  'https://www.youtube.com/playlist?list=PLfwK-27X-RuFFsTEliY6_Xd2m8uXePQA3';
let current: StudentVideo[] = fallback;
let pending: Promise<void> | undefined;
const listeners = new Set<(videos: StudentVideo[]) => void>();

function refresh() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base || pending) return;
  pending = (async () => {
    try {
      const response = await fetch(`${base}/functions/v1/student-videos`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (
        !Array.isArray(data.videos) ||
        !data.videos.length ||
        !data.videos.every(
          (v: StudentVideo) =>
            /^[\w-]{11}$/.test(v.id) &&
            typeof v.title === 'string' &&
            typeof v.thumbnail === 'string' &&
            typeof v.description === 'string' &&
            typeof v.author === 'string' &&
            Number.isFinite(v.duration),
        )
      )
        return;
      current = data.videos;
      listeners.forEach((listener) => listener(current));
    } catch {
      // Keep the last usable collection when the network is unavailable.
    }
  })().finally(() => {
    pending = undefined;
  });
}

export function useStudentVideos() {
  const [videos, setVideos] = useState(current);
  useEffect(() => {
    listeners.add(setVideos);
    setVideos(current);
    refresh();
    const timer = window.setInterval(refresh, 15 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      listeners.delete(setVideos);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return videos;
}

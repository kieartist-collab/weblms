import { useEffect, useRef, useState } from 'react';

type Player = { mute(): void; playVideo(): void; destroy(): void };
type YouTubeAPI = {
  Player: new (
    node: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady(event: { target: Player }): void;
        onStateChange(event: { data: number }): void;
        onError(): void;
        onAutoplayBlocked(): void;
      };
    },
  ) => Player;
};
const youtubeWindow = window as typeof window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};
let apiPromise: Promise<YouTubeAPI> | undefined;
function loadAPI() {
  if (youtubeWindow.YT?.Player) return Promise.resolve(youtubeWindow.YT);
  if (!apiPromise)
    apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
      const previous = youtubeWindow.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => reject(new Error('YouTube unavailable')), 15000);
      youtubeWindow.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previous?.();
        if (youtubeWindow.YT) resolve(youtubeWindow.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('YouTube unavailable'));
      };
      document.head.appendChild(script);
    });
  return apiPromise;
}

// Keep the poster until playback really starts, including when embedding is blocked.
export function SpiralVideo({ id, active }: { id: string; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setPlaying(false);
    if (!active || !host.current) return;
    let cancelled = false;
    let player: Player | undefined;
    const container = host.current;
    const mount = document.createElement('div');
    container.appendChild(mount);
    loadAPI()
      .then((api) => {
        if (cancelled) return;
        player = new api.Player(mount, {
          width: 480,
          height: 270,
          videoId: id,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            playsinline: 1,
            loop: 1,
            playlist: id,
            disablekb: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const iframe = container.querySelector('iframe');
              if (iframe) {
                iframe.tabIndex = -1;
                iframe.title = 'Video sản phẩm học viên';
              }
              event.target.mute();
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (!cancelled && event.data === 1) setPlaying(true);
            },
            onError: () => {
              if (!cancelled) setPlaying(false);
            },
            onAutoplayBlocked: () => {
              if (!cancelled) setPlaying(false);
            },
          },
        });
      })
      .catch(() => {
        /* The thumbnail remains available when YouTube cannot load. */
      });
    return () => {
      cancelled = true;
      player?.destroy();
      container.replaceChildren();
    };
  }, [id, active]);
  return <div ref={host} className={`spiral-video ${playing ? 'is-playing' : ''}`} />;
}

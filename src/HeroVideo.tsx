import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export function HeroVideo() {
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPlaying(!preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return (
    <>
      <div className="hero-video-backdrop" aria-hidden="true">
        <img src="https://i.ytimg.com/vi/EQ-YSLeA_KA/maxresdefault.jpg" alt="" />
        {playing && <iframe
          src="https://www.youtube.com/embed/EQ-YSLeA_KA?autoplay=1&mute=1&loop=1&playlist=EQ-YSLeA_KA&controls=0&playsinline=1&rel=0&disablekb=1"
          title="Video nền giới thiệu"
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />}
      </div>
      <div className="hero-image-shade" />
      <button type="button" className="hero-video-toggle" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Dừng video nền' : 'Phát video nền'}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? 'Dừng video' : 'Phát video'}
      </button>
    </>
  );
}

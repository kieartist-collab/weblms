import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import videos from './student-videos.json';
import { SpiralVideo } from './SpiralVideo';
import './spiral-hero.css';

const artworks = videos.slice(0, 20);
const stars = Array.from({ length: 64 }, (_, i) => ({
  x: (i * 61.803 + 9) % 100,
  y: (i * 37.719 + 13) % 100,
  depth: 0.25 + (i % 5) * 0.19,
  size: i % 9 === 0 ? 4 : 1 + (i % 3) * 0.6,
}));
const turns = Math.PI * 5;
function position(t: number) {
  const angle = t * turns - 1.3;
  const radius = 145 + t * 810;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.67 };
}
const spiral = Array.from({ length: 361 }, (_, i) => {
  const p = position(i / 360);
  return `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}).join(' ');

export function SpiralHero() {
  const pointer = useRef({ x: 0, y: 0, currentX: 0, currentY: 0 });
  const scene = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const animationTime = useRef(0);
  const sizeTracks = useRef<
    { from: number; to: number; start: number; duration: number; next: number }[]
  >([]);
  const selectedVideos = useRef<number[]>([]);
  if (!sizeTracks.current.length) {
    sizeTracks.current = artworks.map(() => {
      const size = 0.7 + Math.random() * 0.95;
      return { from: size, to: size, start: 0, duration: 5, next: 3 + Math.random() * 12 };
    });
  }
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [activeVideos, setActiveVideos] = useState<number[]>([]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    const cards = Array.from(node.querySelectorAll<HTMLElement>('.spiral-art'));
    let visible = true,
      frame = 0,
      previous = 0;
    const starNodes = Array.from(node.parentElement!.querySelectorAll<HTMLElement>('.spiral-star'));
    const glowPaths = Array.from(node.querySelectorAll<SVGPathElement>('.spiral-glow-trail'));
    const paint = () => {
      const cursor = pointer.current;
      cursor.currentX += (cursor.x - cursor.currentX) * 0.055;
      cursor.currentY += (cursor.y - cursor.currentY) * 0.055;
      starNodes.forEach((star, i) => {
        const depth = stars[i].depth;
        const drift = reduced ? 0 : Math.sin(animationTime.current * 0.45 + i) * 7;
        star.style.transform = `translate3d(${cursor.currentX * depth * 65 + drift}px,${cursor.currentY * depth * 45 + drift * 0.7}px,0)`;
        star.style.opacity = String(
          0.35 + 0.5 * (reduced ? 0.5 : (Math.sin(animationTime.current * 0.8 + i * 2) + 1) / 2),
        );
      });
      glowPaths.forEach((path, i) => {
        path.style.strokeDashoffset = String(-(animationTime.current * 22 + i * 330) % 1000);
      });
      cards.forEach((card, i) => {
        const t = (i / cards.length + progress.current) % 1;
        const p = position(t);
        const track = sizeTracks.current[i];
        const now = animationTime.current;
        if (now >= track.next) {
          track.from = track.to;
          track.to = 0.7 + Math.random() * 0.95;
          track.start = now;
          track.duration = 4 + Math.random() * 3;
          track.next = now + track.duration + 5 + Math.random() * 8;
        }
        const blend = Math.min(1, Math.max(0, (now - track.start) / track.duration));
        const eased = blend * blend * (3 - 2 * blend);
        const scale = (0.36 + t * 0.78) * (track.from + (track.to - track.from) * eased);
        // Fully invisible around the wrap; smooth fades also have zero endpoint velocity.
        const fade = Math.max(0, Math.min(1, (t - 0.035) / 0.09, (0.965 - t) / 0.09));
        const opacity = fade * fade * (3 - 2 * fade);
        card.style.transform = `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%) scale(${scale})`;
        card.style.opacity = String(opacity * 0.86);
      });
    };
    const selectVideos = () => {
      if (!visible || document.hidden || paused || reduced) {
        selectedVideos.current = [];
        setActiveVideos((old) => (old.length ? [] : old));
        return;
      }
      const hero = node.parentElement!.getBoundingClientRect();
      const copy = node.parentElement!.querySelector('.spiral-copy')!.getBoundingClientRect();
      const candidates = cards
        .map((card, index) => ({
          index,
          rect: card.getBoundingClientRect(),
          opacity: Number(card.style.opacity),
        }))
        .filter(
          ({ rect, opacity }) =>
            opacity > 0.08 &&
            rect.width > 0 &&
            rect.right > 0 &&
            rect.left < innerWidth &&
            rect.bottom > Math.max(0, hero.top) &&
            rect.top < Math.min(innerHeight, hero.bottom) &&
            !(
              rect.left > copy.left &&
              rect.right < copy.right &&
              rect.top > copy.top &&
              rect.bottom < copy.bottom
            ),
        )
        // Keep visible players mounted when random sizes change their ranking.
        .sort(
          (a, b) =>
            Number(selectedVideos.current.includes(b.index)) -
              Number(selectedVideos.current.includes(a.index)) || b.rect.width - a.rect.width,
        )
        .slice(0, innerWidth < 600 ? 3 : 6)
        .map((item) => item.index)
        .sort((a, b) => a - b);
      selectedVideos.current = candidates;
      setActiveVideos((old) => (old.join(',') === candidates.join(',') ? old : candidates));
    };
    const tick = (now: number) => {
      if (previous) {
        const elapsed = Math.min(now - previous, 50);
        animationTime.current += elapsed / 1000;
        progress.current = (progress.current + elapsed / 180000) % 1;
      }
      previous = now;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      selectVideos();
      if (visible && !document.hidden && !paused && !reduced) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener('visibilitychange', sync);
    paint();
    sync();
    const selectionTimer = window.setInterval(selectVideos, 1000);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.clearInterval(selectionTimer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [paused, reduced]);

  return (
    <section
      className={`spiral-hero ${paused || reduced ? 'is-still' : ''}`}
      aria-labelledby="welcome-title"
      onPointerMove={(event) => {
        if (paused || reduced || event.pointerType === 'touch') return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.current.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      }}
      onPointerLeave={() => {
        pointer.current.x = 0;
        pointer.current.y = 0;
      }}
    >
      <div className="spiral-stars" aria-hidden="true">
        {stars.map((star, i) => (
          <span
            key={i}
            className={`spiral-star ${i % 9 === 0 ? 'is-spark' : ''}`}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="spiral-scene" ref={scene} aria-hidden="true">
        <svg className="spiral-lines" viewBox="-1000 -670 2000 1340" fill="none">
          <path d={spiral} />
          <path d={spiral} transform="rotate(12)" className="spiral-line-fine" />
          <path d={spiral} transform="rotate(-12)" className="spiral-line-dashed" />
        </svg>
        <svg className="spiral-lines spiral-glow-lines" viewBox="-1000 -670 2000 1340" fill="none">
          <path d={spiral} pathLength="1000" className="spiral-glow-trail" />
          <path
            d={spiral}
            pathLength="1000"
            transform="rotate(12)"
            className="spiral-glow-trail spiral-glow-violet"
          />
          <path
            d={spiral}
            pathLength="1000"
            transform="rotate(-12)"
            className="spiral-glow-trail spiral-glow-fine"
          />
        </svg>
        {artworks.map((video, i) => (
          <div
            className="spiral-art"
            key={video.id}
            onPointerMove={(event) => {
              if (reduced || paused || event.pointerType === 'touch') return;
              const rect = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - rect.left) / rect.width - 0.5;
              const y = (event.clientY - rect.top) / rect.height - 0.5;
              event.currentTarget.style.setProperty('--tilt-x', `${-y * 22}deg`);
              event.currentTarget.style.setProperty('--tilt-y', `${x * 26}deg`);
              event.currentTarget.style.setProperty('--warp', `${x * 18}deg`);
              event.currentTarget.style.setProperty('--stretch-x', String(1 + Math.abs(x) * 0.26));
              event.currentTarget.style.setProperty('--stretch-y', String(1 - Math.abs(y) * 0.2));
              event.currentTarget.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`);
              event.currentTarget.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`);
            }}
            onPointerLeave={(event) => {
              [
                '--tilt-x',
                '--tilt-y',
                '--warp',
                '--stretch-x',
                '--stretch-y',
                '--shine-x',
                '--shine-y',
              ].forEach((key) => event.currentTarget.style.removeProperty(key));
            }}
          >
            <div className="spiral-art-surface">
              <div className="spiral-media">
                <img
                  src={video.thumbnail}
                  alt=""
                  width="320"
                  height="180"
                  decoding="async"
                  fetchPriority={i < 4 ? 'high' : 'low'}
                />
                <SpiralVideo id={video.id} active={activeVideos.includes(i)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="spiral-shade" aria-hidden="true" />
      <div className="spiral-copy">
        <span className="spiral-kicker">
          <span /> KISTEIN DO · CG GENERALIST
        </span>
        <h1 id="welcome-title">
          Biến ý tưởng thành
          <br />
          <em>thế giới của bạn.</em>
        </h1>
        <p>
          Làm chủ 3D, thiết kế và làm phim
          <br className="spiral-desktop-break" /> qua từng dự án thực hành.
        </p>
        <div className="spiral-actions">
          <Link to="/courses" className="button">
            Khám phá khóa học <ArrowUpRight size={18} />
          </Link>
          <Link to="/#student-work" className="button secondary">
            Sản phẩm học viên <Play size={15} />
          </Link>
        </div>
        <span className="spiral-signature">LEARN / CREATE / REPEAT</span>
      </div>
      <div className="spiral-bottom">
        <Link to="/#courses" className="spiral-scroll">
          <ArrowDown size={16} /> Cuộn để khám phá
        </Link>
        {!reduced && (
          <button
            type="button"
            className="spiral-pause"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Tiếp tục hiệu ứng' : 'Tạm dừng hiệu ứng'}
            aria-pressed={paused}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
            <span>{paused ? 'Tiếp tục' : 'Tạm dừng'}</span>
          </button>
        )}
      </div>
    </section>
  );
}

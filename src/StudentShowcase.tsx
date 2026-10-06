import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, ArrowUpRight, Clapperboard } from 'lucide-react';
import videos from './student-videos.json';

const playlist = 'https://www.youtube.com/playlist?list=PLfwK-27X-RuFFsTEliY6_Xd2m8uXePQA3';

function VideoPopup({ video, close }: { video: (typeof videos)[number]; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="showcase-dialog"
      aria-labelledby="showcase-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="showcase-player">
        <div className="showcase-player-heading">
          <span className="eyebrow">STUDENT SHOWCASE</span>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            aria-label="Đóng video"
            autoFocus
          >
            <X />
          </button>
        </div>
        <iframe
          title={video.title}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className="exhibition-details">
          <h2 id="showcase-title">{video.title}</h2>
          <span className="cinema-credit">
            {video.author} · {duration(video.duration)}
          </span>
          {video.description && <p>{video.description}</p>}
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noreferrer"
          className="showcase-youtube"
        >
          Không xem được? Mở trên YouTube <ArrowUpRight size={16} />
        </a>
      </div>
    </dialog>,
    document.body,
  );
}

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function ExhibitionFilm({
  video,
  open,
  featured = false,
}: {
  video: (typeof videos)[number];
  open: () => void;
  featured?: boolean;
}) {
  return (
    <button
      className={`exhibition-film ${featured ? 'exhibition-featured' : ''}`}
      type="button"
      onClick={open}
      aria-label={`Xem tác phẩm: ${video.title}`}
    >
      <span className="exhibition-image">
        <img src={video.thumbnail} alt="" loading="lazy" width="1920" height="1080" />
        <span className="exhibition-watch">
          <Play size={16} fill="currentColor" /> Xem tác phẩm
        </span>
      </span>
      <span className="exhibition-caption">
        <strong>{video.title}</strong>
        <span>{duration(video.duration)}</span>
      </span>
    </button>
  );
}

export function StudentShowcase() {
  const [selected, setSelected] = useState<(typeof videos)[number] | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const sentinel = useRef<HTMLDivElement>(null);
  const collection = videos.slice(1);
  useEffect(() => {
    if (
      visibleCount >= collection.length ||
      !sentinel.current ||
      !('IntersectionObserver' in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setVisibleCount((count) => Math.min(count + 10, collection.length));
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [visibleCount, collection.length]);
  return (
    <section
      id="student-work"
      className="container home-section showcase-section cinema-section exhibition-section"
    >
      <div className="cinema-heading">
        <div>
          <span className="eyebrow section-kicker">
            <Clapperboard size={18} aria-hidden="true" /> STUDENT SHOWCASE / SẢN PHẨM HỌC VIÊN
          </span>
          <h2>
            Từ bài học
            <br />
            <em>đến màn ảnh.</em>
          </h2>
        </div>
        <a href={playlist} target="_blank" rel="noreferrer" className="text-link">
          Toàn bộ playlist <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="exhibition-spotlight">
        <button
          type="button"
          className="exhibition-film exhibition-featured"
          onClick={() => setSelected(videos[0])}
          aria-label={`Xem tác phẩm: ${videos[0].title}`}
        >
          <span className="exhibition-image">
            <img src={videos[0].thumbnail} alt="" loading="lazy" width="1920" height="1080" />
            <span className="exhibition-watch">
              <Play size={16} fill="currentColor" /> Xem tác phẩm
            </span>
          </span>
        </button>
        <div className="exhibition-feature-copy">
          <span className="exhibition-label">TÁC PHẨM NỔI BẬT</span>
          <h3>{videos[0].title}</h3>
          <span className="cinema-credit">
            {videos[0].author} · {duration(videos[0].duration)}
          </span>
          <p>{videos[0].description}</p>
          <button type="button" className="button" onClick={() => setSelected(videos[0])}>
            <Play size={16} /> Xem tác phẩm
          </button>
        </div>
      </div>
      <div className="exhibition-collection-heading">
        <span>KHÁM PHÁ CÁC TÁC PHẨM</span>
        <span aria-live="polite">
          {Math.min(visibleCount, collection.length) + 1} / {videos.length}
        </span>
      </div>
      <div className="exhibition-grid">
        {collection.slice(0, visibleCount).map((video) => (
          <ExhibitionFilm key={video.id} video={video} open={() => setSelected(video)} />
        ))}
      </div>
      {visibleCount < collection.length && (
        <div ref={sentinel} className="cinema-load-more">
          <button
            type="button"
            className="button secondary"
            onClick={() => setVisibleCount((count) => Math.min(count + 10, collection.length))}
          >
            Xem thêm tác phẩm
          </button>
        </div>
      )}
      {selected && <VideoPopup video={selected} close={() => setSelected(null)} />}
    </section>
  );
}

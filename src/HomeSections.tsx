import { MentorTeam } from './MentorTeam';
import { useEffect, useRef } from 'react';
import { Quote, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { faqs, reviews } from './home-content';
import { StudentShowcase } from './StudentShowcase';
import { MessageSquareQuote, CircleHelp } from 'lucide-react';

export function HomeSections() {
  const reviewTrack = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    scroll: number;
    lastX: number;
    time: number;
    velocity: number;
  } | null>(null);
  const motion = useRef({ target: 0, frame: 0, time: 0 });
  function stopMotion() {
    cancelAnimationFrame(motion.current.frame);
    motion.current.frame = 0;
  }
  function moveTo(target: number) {
    const track = reviewTrack.current;
    if (!track) return;
    motion.current.target = Math.max(0, Math.min(target, track.scrollWidth - track.clientWidth));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopMotion();
      track.scrollLeft = motion.current.target;
      return;
    }
    if (motion.current.frame) return;
    motion.current.time = performance.now();
    function tick(now: number) {
      if (!track) return;
      const dt = Math.min(now - motion.current.time, 50);
      motion.current.time = now;
      const distance = motion.current.target - track.scrollLeft;
      if (Math.abs(distance) < 2) {
        track.scrollLeft = motion.current.target;
        motion.current.frame = 0;
        return;
      }
      track.scrollLeft += distance * (1 - Math.exp(-dt / 90));
      motion.current.frame = requestAnimationFrame(tick);
    }
    motion.current.frame = requestAnimationFrame(tick);
  }
  useEffect(() => {
    const track = reviewTrack.current;
    if (!track) return;
    function wheel(event: WheelEvent) {
      if (event.ctrlKey || !track || drag.current) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const amount =
        delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1);
      const base = motion.current.frame ? motion.current.target : track.scrollLeft;
      const canScroll = amount > 0 ? base < track.scrollWidth - track.clientWidth - 1 : base > 0;
      if (canScroll) {
        event.preventDefault();
        moveTo(base + amount);
      }
    }
    track.addEventListener('wheel', wheel, { passive: false });
    return () => {
      track.removeEventListener('wheel', wheel);
      stopMotion();
    };
  }, []);
  function scrollReviews(direction: number) {
    const track = reviewTrack.current;
    if (track)
      moveTo(
        (motion.current.frame ? motion.current.target : track.scrollLeft) +
          direction * track.clientWidth * 0.85,
      );
  }
  return (
    <>
      <StudentShowcase />
      <section id="reviews" className="container home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow section-kicker">
              <MessageSquareQuote size={18} aria-hidden="true" /> ĐÁNH GIÁ MẪU
            </span>
            <h2>Góc nhìn từ người học.</h2>
          </div>
        </div>
        <div className="review-toolbar">
          <span>Kéo để khám phá · CG Generalist Kistein Do</span>
          <div>
            <button
              className="icon-button"
              type="button"
              aria-label="Cuộn đánh giá sang trái"
              aria-controls="review-track"
              onClick={() => scrollReviews(-1)}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Cuộn đánh giá sang phải"
              aria-controls="review-track"
              onClick={() => scrollReviews(1)}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <div
          id="review-track"
          className="review-track"
          ref={reviewTrack}
          tabIndex={0}
          role="region"
          aria-label="Đánh giá minh họa, cuộn ngang để xem thêm"
          onPointerDown={(event) => {
            stopMotion();
            if (event.pointerType !== 'mouse' || event.button > 1) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            drag.current = {
              x: event.clientX,
              scroll: event.currentTarget.scrollLeft,
              lastX: event.clientX,
              time: performance.now(),
              velocity: 0,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.classList.add('is-dragging');
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const now = performance.now();
            const dt = Math.max(1, now - drag.current.time);
            const velocity = (drag.current.lastX - event.clientX) / dt;
            drag.current.velocity = drag.current.velocity * 0.3 + velocity * 0.7;
            drag.current.lastX = event.clientX;
            drag.current.time = now;
            event.currentTarget.scrollLeft = drag.current.scroll + drag.current.x - event.clientX;
          }}
          onPointerUp={(event) => {
            const velocity =
              drag.current && performance.now() - drag.current.time < 100
                ? drag.current.velocity
                : 0;
            drag.current = null;
            moveTo(event.currentTarget.scrollLeft + Math.max(-2.5, Math.min(2.5, velocity)) * 180);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            event.currentTarget.classList.remove('is-dragging');
          }}
          onPointerCancel={(event) => {
            drag.current = null;
            event.currentTarget.classList.remove('is-dragging');
          }}
          onLostPointerCapture={(event) => {
            drag.current = null;
            event.currentTarget.classList.remove('is-dragging');
          }}
          onAuxClick={(event) => {
            if (event.button === 1) event.preventDefault();
          }}
        >
          {reviews.map((review, i) => (
            <figure className="review-card" key={review.label}>
              <Quote size={23} aria-hidden="true" />
              <blockquote>{review.quote}</blockquote>
              <figcaption>
                <span
                  className="review-avatar review-avatar-student"
                  role="img"
                  aria-label={`Chân dung AI minh họa nhân vật ${review.label}`}
                  style={{
                    backgroundPosition: `${(i % 5) * 25}% ${(Math.floor(i / 5) * 100) / 3}%`,
                  }}
                />
                <div>
                  {review.label}
                  <small>{review.role}</small>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <MentorTeam />
      <section id="faq" className="container home-section faq-section">
        <div>
          <span className="eyebrow section-kicker">
            <CircleHelp size={18} aria-hidden="true" /> GIẢI ĐÁP
          </span>
          <h2>
            Câu hỏi <br />
            thường gặp.
          </h2>
          <p>Một vài điều trước khi bắt đầu.</p>
        </div>
        <div className="faq-columns">
          {[faqs.slice(0, 9), faqs.slice(9)].map((column, index) => (
            <div className="faq-list" key={index}>
              {column.map((faq) => (
                <details key={faq.question}>
                  <summary>
                    {faq.question}
                    <Plus size={19} />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Progressive enhancement: content stays visible without JS or when motion is reduced. */
export function MotionSurface({ children, ready }: { children: ReactNode; ready: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = [
      ...(root.current?.querySelectorAll<HTMLElement>(
        '.course-card, .home-section, .closing-cta',
      ) || []),
    ];
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    const revealAll = () => {
      if (media.matches) {
        elements.forEach((element) => element.classList.add('is-visible'));
        observer.disconnect();
      }
    };
    if (!media.matches)
      elements.forEach((element, index) => {
        if (element.getBoundingClientRect().top < window.innerHeight) return;
        element.classList.add('reveal-ready');
        element.style.setProperty(
          '--reveal-delay',
          `${element.classList.contains('course-card') ? (index % 3) * 70 : 0}ms`,
        );
        observer.observe(element);
      });
    media.addEventListener('change', revealAll);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', revealAll);
      elements.forEach((element) => element.classList.remove('reveal-ready', 'is-visible'));
    };
  }, [ready]);
  return (
    <div ref={root} className="landing-page">
      {children}
    </div>
  );
}

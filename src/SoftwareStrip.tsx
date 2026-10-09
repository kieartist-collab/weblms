import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Layers3 } from 'lucide-react';
import './software-strip.css';

const software = [
  ['Autodesk Maya', 'autodeskmaya.svg', true],
  ['Substance 3D Painter', 'painter.svg', false],
  ['Cinema 4D', 'cinema4d.svg', true],
  ['Blender', 'blender.svg', true],
  ['ZBrush', 'zbrush.svg', false],
  ['CapCut', 'capcut.ico', false],
  ['Premiere Pro', 'adobepremierepro.svg', true],
  ['After Effects', 'adobeaftereffects.svg', true],
  ['DaVinci Resolve', 'davinciresolve.svg', true],
  ['SpeedTree', 'speedtree.png', false],
  ['EmberGen', 'embergen.svg', false],
  ['Gaea', 'gaea.ico', false],
  ['Cascadeur', 'cascadeur.png', false],
  ['Plasticity', 'plasticity.png', false],
] as const;

export function SoftwareStrip() {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={root}
      className={`software-strip ${paused || !visible ? 'is-paused' : ''}`}
      aria-labelledby="software-heading"
    >
      <div className="container software-heading-row">
        <div>
          <span className="eyebrow">
            <Layers3 size={15} aria-hidden="true" /> BỘ CÔNG CỤ SÁNG TẠO
          </span>
          <h2 id="software-heading">Phần mềm trong khóa học của chúng tôi</h2>
        </div>
        <button
          type="button"
          className="software-toggle"
          aria-label={paused ? 'Tiếp tục chạy logo' : 'Tạm dừng chạy logo'}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>
      <div className="software-window">
        <div className="software-belt">
          {[0, 1].map((copy) => (
            <ul className="software-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {software.map(([name, file, invert]) => (
                <li className="software-brand" key={name}>
                  <img
                    src={`/images/software/${file}`}
                    alt=""
                    width="42"
                    height="42"
                    className={invert ? 'software-symbol' : ''}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

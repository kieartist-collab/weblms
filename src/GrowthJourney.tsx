import { BriefcaseBusiness, Radar, Sparkles, Lightbulb, TrendingUp } from 'lucide-react';

import './growth-journey.css';

const steps = [
  { title: 'Cơ hội nghề nghiệp', description: 'Mở hướng đi với 3D, motion, dựng phim và sáng tạo nội dung.', icon: BriefcaseBusiness },
  { title: 'Xu hướng thị trường', description: 'Cập nhật kỹ năng, chọn hướng đi phù hợp với công việc bạn theo đuổi.', icon: Radar },
  { title: 'Tăng tốc với AI', description: 'Giảm thao tác lặp lại, thử nghiệm ý tưởng và hoàn thiện sản phẩm nhanh hơn.', icon: Sparkles },
  { title: 'Làm chủ sáng tạo', description: 'Tư duy, thẩm mỹ và câu chuyện của bạn tạo nên sự khác biệt.', icon: Lightbulb },
];
const points = [{ x: 125, y: 165 }, { x: 375, y: 120 }, { x: 625, y: 70 }, { x: 875, y: 20 }];

export function GrowthJourney() {
  return (
    <section className="growth-journey" aria-labelledby="growth-heading">
      <div className="growth-inner">
        <header className="growth-heading">
          <span className="eyebrow"><TrendingUp size={17} aria-hidden="true" /> BƯỚC TIẾP THEO CỦA BẠN</span>
          <h2 id="growth-heading">Nâng kỹ năng. Mở cơ hội. <em>Tạo dấu ấn.</em></h2>
        </header>
        <div className="growth-diagram">
          <svg className="growth-route" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
            {[20, 70, 120, 165].map((y) => <path key={y} className="growth-gridline" d={`M 0 ${y} H 1000`} />)}
            <path className="growth-area" d="M125 165 L375 120 L625 70 L875 20 L875 200 L125 200 Z" />
            <path className="growth-route-base" d="M125 165 L375 120 L625 70 L875 20" />
            <path className="growth-route-light" pathLength="100" d="M125 165 L375 120 L625 70 L875 20" />
            {points.map(({ x, y }) => <path key={x} className="growth-guide" d={`M${x} ${y + 10} V200`} />)}
          </svg>
          <div className="growth-markers" aria-hidden="true">
            {points.map(({ y }, index) => <span className="growth-marker" key={y} style={{ top: `${y / 2}%`, left: `${12.5 + index * 25}%` }}>{String(index + 1).padStart(2, '0')}</span>)}
          </div>
          <ol className="growth-stages">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <li className="growth-stage" key={title}>
                <div className="growth-stage-top"><Icon size={20} aria-hidden="true" /><span>BƯỚC {String(index + 1).padStart(2, '0')}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

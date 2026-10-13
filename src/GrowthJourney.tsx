import { ArrowUpRight, Compass, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import './growth-journey.css';

export function GrowthJourney() {
  return (
    <section className="growth-journey" aria-labelledby="growth-heading">
      <div className="growth-inner">
        <header className="growth-heading">
          <span className="eyebrow"><TrendingUp size={17} aria-hidden="true" /> BƯỚC TIẾP THEO CỦA BẠN</span>
          <h2 id="growth-heading">Nâng kỹ năng. Mở cơ hội.<br /><em>Tạo dấu ấn.</em></h2>
          <p>Từ định hướng nghề nghiệp đến làm chủ quy trình sáng tạo của riêng bạn.</p>
        </header>

        <div className="growth-diagram">
          <svg className="growth-route" viewBox="0 0 1400 440" preserveAspectRatio="none" aria-hidden="true">
            <path className="growth-route-base" d="M 20 405 C 360 405 430 395 660 245 S 1080 30 1380 30" />
            <path className="growth-route-light" pathLength="100" d="M 20 405 C 360 405 430 395 660 245 S 1080 30 1380 30" />
          </svg>
          <ol className="growth-stages">
            <li className="growth-stage growth-stage-first">
              <div className="growth-stage-top"><span className="growth-icon"><Compass size={25} aria-hidden="true" /></span><span className="growth-step">01 / ĐỊNH HƯỚNG</span></div>
              <h3>Nắm bắt thị trường.<br /><span>Mở rộng cơ hội nghề nghiệp.</span></h3>
              <p>Khám phá hướng đi trong 3D, motion graphics, dựng phim và sáng tạo nội dung. Hiểu cách các kỹ năng được ứng dụng trong công việc để chọn mục tiêu và xây dựng portfolio phù hợp.</p>
              <ul className="growth-tags" aria-label="Các hướng nghề nghiệp"><li>3D Artist</li><li>Motion Designer</li><li>Video Editor</li><li>Content Creator</li></ul>
              <div className="growth-outcome"><ArrowUpRight size={17} aria-hidden="true" /> Chọn hướng đi · Xây dựng portfolio</div>
            </li>
            <li className="growth-stage growth-stage-second">
              <div className="growth-stage-top"><span className="growth-icon"><Sparkles size={25} aria-hidden="true" /></span><span className="growth-step">02 / PHÁT TRIỂN</span></div>
              <h3>Tăng tốc với AI.<br /><span>Dẫn đường bằng sáng tạo.</span></h3>
              <p>Ứng dụng AI để hỗ trợ phát triển ý tưởng và giảm thao tác lặp lại. Dành nhiều thời gian hơn cho thẩm mỹ, kể chuyện và hoàn thiện sản phẩm — những yếu tố tạo nên dấu ấn của bạn.</p>
              <ul className="growth-tags" aria-label="Năng lực phát triển"><li>Quy trình với AI</li><li>Tư duy thẩm mỹ</li><li>Kể chuyện</li></ul>
              <div className="growth-outcome"><ArrowUpRight size={17} aria-hidden="true" /> AI hỗ trợ quy trình · Bạn làm chủ ý tưởng</div>
            </li>
          </ol>
        </div>

        <footer className="growth-footer">
          <p>Làm chủ quy trình. <strong>Phát triển dấu ấn riêng.</strong></p>
          <Link to="/courses" className="growth-cta">Khám phá khóa học <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </footer>
      </div>
    </section>
  );
}

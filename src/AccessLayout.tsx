import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CircleCheck, FileText, GraduationCap, Play, ShieldCheck } from 'lucide-react';
import './access-layout.css';

export function AccessLayout({ children, learning = false }: { children: ReactNode; learning?: boolean }) {
  return (
    <section className={`access-page ${learning ? 'access-learning' : ''}`}>
      <div className="access-shell">
        <div className="access-story">
          <span className="eyebrow"><GraduationCap size={17} aria-hidden="true" /> HỌC · THỰC HÀNH · SÁNG TẠO</span>
          <h1>{learning ? <>Không gian học tập.<br /><em>Dành riêng cho bạn.</em></> : <>Ý tưởng của bạn.<br /><em>Hành trình của bạn.</em></>}</h1>
          <p>{learning ? 'Các khóa học đã đăng ký, tiến độ và tài liệu được tập hợp tại một nơi.' : 'Tiếp nối những bài học, luyện tập kỹ năng và từng bước biến ý tưởng thành sản phẩm.'}</p>
          <div className="access-visual" aria-hidden="true">
            <div className="access-orbit" />
            <div className="access-preview">
              <div className="access-preview-top"><BookOpen size={19} /><span>HÀNH TRÌNH SÁNG TẠO</span><span className="access-live-dot" /></div>
              <div className="access-preview-art"><GraduationCap size={66} strokeWidth={1} /><span>LEARN / CREATE / REPEAT</span></div>
              <div className="access-preview-row"><span className="access-preview-icon"><Play size={15} /></span><div><strong>Học qua từng dự án</strong><small>Từ ý tưởng đến sản phẩm</small></div><CircleCheck size={19} /></div>
            </div>
            <div className="access-resource"><FileText size={19} /><span>Video & tài liệu<small>Đồng hành khi thực hành</small></span></div>
          </div>
        </div>
        <div className="access-panel">
          <div className="access-panel-icon"><BookOpen size={25} aria-hidden="true" /></div>
          <span className="eyebrow">{learning ? 'GÓC HỌC TẬP' : 'CHÀO MỪNG BẠN TRỞ LẠI'}</span>
          <h2>{learning ? 'Bắt đầu từ đây.' : 'Tiếp tục hành trình.'}</h2>
          <p className="access-description">Đăng nhập bằng tài khoản Google bạn dùng để đăng ký khóa học.</p>
          <div className="access-action">{children}</div>
          <div className="access-note"><ShieldCheck size={19} aria-hidden="true" /><p>Sử dụng cùng một email để nhận quyền học và xem tài liệu Google Drive. Quyền truy cập được cấp sau khi xác nhận thanh toán.</p></div>
          <Link to="/courses" className="access-back"><ArrowLeft size={16} aria-hidden="true" /> Khám phá các khóa học</Link>
        </div>
      </div>
    </section>
  );
}

export function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59A5.98 5.98 0 0 1 12 5.95Z" /></svg>;
}

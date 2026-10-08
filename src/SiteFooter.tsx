import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowUp, BookOpen, Compass, Facebook, GraduationCap, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { contact } from './ContactInfo';

export function SiteFooter() {
 return <footer className="premium-footer">
  <div className="pf-shell">
   <div className="pf-invitation"><div><span className="pf-eyebrow">HỌC · THỰC HÀNH · SÁNG TẠO</span><h2>Bước tiếp theo của bạn bắt đầu từ đây.</h2></div><Link className="pf-course-button" to="/courses">Khám phá khóa học<ArrowUpRight size={19}/></Link></div>
   <div className="pf-grid">
    <div className="pf-brand-column"><Link to="/" className="brand"><span className="brand-icon"><GraduationCap size={26}/></span><span>học viện<span className="brand-sub">ONLINE</span></span></Link><p>Học kỹ năng. Tạo giá trị.</p><span className="pf-description">Khóa học về 3D, thiết kế và làm phim.<br/>Cùng Kistein Do biến kiến thức thành sản phẩm.</span><div className="pf-socials"><a href={contact.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook Kistein Do" title="Facebook"><Facebook size={19}/></a><a href={contact.zalo} target="_blank" rel="noopener noreferrer" aria-label="Zalo Kistein Do" title="Zalo"><MessageCircle size={19}/></a><a href={`mailto:${contact.email}`} aria-label="Gửi email cho Kistein Do" title="Email"><Mail size={19}/></a></div></div>
    <nav className="pf-links" aria-label="Khám phá ở chân trang"><h3><Compass size={16}/>Khám phá</h3><Link to="/courses">Khóa học</Link><Link to="/#student-work">Sản phẩm học viên</Link><Link to="/#author">Về tác giả</Link><Link to="/#reviews">Đánh giá học viên</Link><Link to="/my-learning">Góc học tập</Link></nav>
    <nav className="pf-links" aria-label="Hướng dẫn và chính sách"><h3><ShieldCheck size={16}/>Thông tin & hỗ trợ</h3><Link to="/pages/huong-dan-mua-khoa-hoc">Hướng dẫn mua khóa học</Link><Link to="/pages/chinh-sach-bao-hanh">Chính sách bảo hành</Link><Link to="/pages/chinh-sach-hoan-tien">Chính sách hoàn tiền</Link><Link to="/pages/mentor-1vs1">Mentor 1vs1</Link><Link to="/#faq">Câu hỏi thường gặp</Link></nav>
    <address className="pf-contact"><h3><MessageCircle size={16}/>Kết nối trực tiếp</h3><strong>{contact.name}</strong><span className="pf-role">Giảng viên 3D · Thiết kế · Làm phim</span><a href={contact.phoneHref}><Phone size={17}/><span><small>Điện thoại</small>{contact.phone}</span></a><a href={`mailto:${contact.email}`}><Mail size={17}/><span><small>Email</small>{contact.email}</span></a><a className="pf-zalo" href={contact.zalo} target="_blank" rel="noopener noreferrer">Trao đổi qua Zalo<ArrowUpRight size={17}/></a></address>
   </div>
   <div className="pf-bottom"><span>© {new Date().getFullYear()} Học viện Online · Kistein Do</span><span className="pf-signoff"><BookOpen size={14}/>Học theo nhịp của bạn.</span><button type="button" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>Về đầu trang<ArrowUp size={15}/></button></div>
  </div>
 </footer>;
}

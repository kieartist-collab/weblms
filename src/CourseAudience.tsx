import { GraduationCap, Clapperboard, Layers3, ArrowUpRight, Compass, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import './course-audience.css';

const audiences = [
  {
    number: '01',
    label: 'BẮT ĐẦU TỪ NỀN TẢNG',
    icon: GraduationCap,
    title: 'Sinh viên & người mới',
    description:
      'Bạn muốn bước vào thế giới 3D, VFX và CGI nhưng chưa biết bắt đầu từ đâu? Xây dựng nền tảng theo từng bước, học qua thực hành và từng bước định hình hướng đi của mình.',
    focus: ['Lộ trình rõ ràng', 'Nền tảng vững chắc'],
    destination: 'Từ chưa biết đến sản phẩm đầu tiên',
  },
  {
    number: '02',
    label: 'NÂNG TẦM TÁC PHẨM',
    icon: Clapperboard,
    title: 'Artist muốn tiến xa hơn',
    description:
      'Bạn đã có kiến thức 3D và muốn nâng cao chất lượng tác phẩm? Trau dồi tư duy hình ảnh, ánh sáng và bố cục để tạo nên những thước phim mang phong cách cinematic.',
    focus: ['Tư duy điện ảnh', 'Hoàn thiện kỹ năng'],
    destination: 'Từ kỹ thuật đến dấu ấn sáng tạo',
  },
  {
    number: '03',
    label: 'KỂ CHUYỆN BẰNG HÌNH ẢNH',
    icon: Layers3,
    title: 'Người học Blender',
    description:
      'Bạn đang dùng Blender ở trình độ sơ cấp hoặc trung cấp và muốn video của mình cuốn hút hơn? Kết nối kỹ năng 3D với cách kể chuyện, nhịp dựng và cảm xúc trong từng khung hình.',
    focus: ['Kỹ năng kể chuyện', 'Dự án thực hành'],
    destination: 'Từ khung hình đến câu chuyện',
  },
];

export function CourseAudience() {
  return (
    <section className="course-audience" aria-labelledby="audience-heading">
      <div className="container">
        <header className="audience-heading">
          <div>
            <span className="eyebrow audience-kicker">
              <Compass size={17} aria-hidden="true" /> HÀNH TRÌNH CỦA BẠN
            </span>
            <h2 id="audience-heading">
              Khóa học này
              <br />
              <em>dành cho ai?</em>
            </h2>
          </div>
          <p>
            Mỗi người có một điểm xuất phát.
            <br />
            Chọn kiến thức phù hợp để tiến thêm một bước trên hành trình sáng tạo của bạn.
          </p>
        </header>
        <div className="audience-grid">
          {audiences.map(
            ({ number, label, icon: Icon, title, description, focus, destination }) => (
              <article className="audience-card" key={number}>
                <div className="audience-card-top">
                  <span className="audience-icon">
                    <Icon size={27} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="audience-number" aria-hidden="true">
                    {number}
                  </span>
                </div>
                <span className="audience-label">{label}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul>
                  {focus.map((item) => (
                    <li key={item}>
                      <Check size={14} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="audience-destination">
                  <span className="audience-dot" aria-hidden="true" />
                  {destination}
                </div>
              </article>
            ),
          )}
        </div>
        <div className="audience-guidance">
          <p>
            <Compass size={19} aria-hidden="true" />
            <span>Chưa rõ nên bắt đầu từ đâu? Cùng tìm hướng học phù hợp với bạn.</span>
          </p>
          <Link to="/pages/mentor-1vs1">
            Tìm hiểu Mentor 1vs1 <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

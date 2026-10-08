import { GraduationCap, Clapperboard, Layers3, ArrowUpRight, Compass, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import './course-audience.css';

const audiences = [
  {
    number: '01',
    label: 'HỌC ĐỂ LÀM ĐƯỢC',
    icon: GraduationCap,
    title: 'Sinh viên ngành sáng tạo',
    description:
      'Dành cho sinh viên muốn củng cố kiến thức, thực hành đồ án và xây dựng portfolio. Khám phá dựng hình với Maya, điêu khắc số với ZBrush và thiết kế chuyển động với Cinema 4D để từng bước biến ý tưởng thành sản phẩm của riêng mình.',
    focus: ['Thực hành đồ án', 'Xây dựng portfolio'],
    destination: 'Từ kiến thức trên lớp đến sản phẩm thực tế',
  },
  {
    number: '02',
    label: 'BẮT ĐẦU TỪ CON SỐ 0',
    icon: Clapperboard,
    title: 'Người mới bắt đầu',
    description:
      'Bạn yêu thích 3D, thiết kế hoặc dựng phim nhưng chưa biết bắt đầu từ đâu? Làm quen từng bước với công cụ và tư duy sáng tạo; học dựng, biên tập video bằng Premiere Pro, CapCut, DaVinci Resolve và khám phá nền tảng 3D theo mục tiêu của bạn.',
    focus: ['Nền tảng dễ tiếp cận', 'Học từng bước'],
    destination: 'Từ lần đầu mở phần mềm đến tự tay sáng tạo',
  },
  {
    number: '03',
    label: 'NÂNG KỸ NĂNG · MỞ KHẢ NĂNG',
    icon: Layers3,
    title: 'Người muốn nâng cao kỹ năng',
    description:
      'Dành cho người đã có nền tảng và muốn nâng chất lượng tác phẩm, hoàn thiện quy trình làm việc. Đào sâu kỹ năng 3D, motion và hậu kỳ, đồng thời khám phá các ứng dụng AI mới nhất để hỗ trợ lên ý tưởng, thử nghiệm và sản xuất nội dung.',
    focus: ['Hoàn thiện quy trình', 'Ứng dụng AI'],
    destination: 'Từ kỹ năng sẵn có đến khả năng sáng tạo mới',
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
            Từ nền tảng đến nâng cao, từ 3D đến dựng phim.
            <br />
            Học Maya, ZBrush, Cinema 4D, Premiere Pro, CapCut, DaVinci Resolve và khám phá các ứng
            dụng AI mới nhất theo mục tiêu của bạn.
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

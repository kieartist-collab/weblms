import { UsersRound, Quote, UserRound, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './mentor-team.css';

const mentors = [
  {
    name: 'Kistein Do',
    role: 'CG Generalist',
    initials: 'KD',
    image: '/images/kistein-do.png',
    specialties: ['3D & CGI', 'Creative workflow'],
    quote:
      'Tôi muốn mỗi bài học giúp bạn hiểu cách làm, không chỉ nhớ thao tác. Hãy bắt đầu từ một ý tưởng nhỏ, thực hành đến cùng và biến nó thành sản phẩm mang dấu ấn của bạn.',
    demo: false,
  },
  {
    name: 'Thai Nam',
    role: 'Director',
    initials: 'TN',
    image: '',
    specialties: ['Đạo diễn', 'Kể chuyện bằng hình ảnh'],
    quote:
      'Mỗi khung hình đều cần có lý do để xuất hiện. Tôi muốn giúp bạn kể câu chuyện bằng bố cục, nhịp điệu và cảm xúc, để ý tưởng trở thành những thước phim chạm đến người xem.',
    demo: true,
  },
  {
    name: 'Nam Chu',
    role: '3D Artist',
    initials: 'NC',
    image: '',
    specialties: ['Modeling', 'Digital sculpting'],
    quote:
      'Một sản phẩm 3D tốt bắt đầu từ việc quan sát. Hiểu hình khối, nắm vững công cụ và kiên nhẫn với từng chi tiết sẽ giúp bạn biến ý tưởng thành tác phẩm có cá tính riêng.',
    demo: true,
  },
];

export function MentorTeam() {
  return (
    <section
      id="author"
      className="mentor-team container home-section"
      aria-labelledby="mentor-team-title"
    >
      <header className="mentor-team-heading">
        <div>
          <span className="eyebrow section-kicker">
            <UsersRound size={18} aria-hidden="true" /> NGƯỜI ĐỨNG SAU BÀI HỌC
          </span>
          <h2 id="mentor-team-title">
            Chia sẻ góc nhìn.
            <br />
            <em>Truyền cảm hứng sáng tạo.</em>
          </h2>
        </div>
        <p>
          Học từ cách làm, hiểu qua thực hành.
          <br />
          Những góc nhìn về kỹ năng, tư duy và hành trình tạo nên một sản phẩm.
        </p>
      </header>
      <div className="mentor-team-grid">
        {mentors.map((mentor, index) => (
          <article
            className={`mentor-profile ${mentor.demo ? 'is-demo' : 'is-founder'}`}
            key={mentor.name}
          >
            <div className="mentor-portrait">
              <span className="mentor-index" aria-hidden="true">
                0{index + 1} / CREATIVE VOICES
              </span>
              <div className="mentor-orbit" aria-hidden="true" />
              {mentor.image ? (
                <img
                  src={mentor.image}
                  alt="Kistein Do — CG Generalist"
                  width="1300"
                  height="1210"
                  loading="lazy"
                />
              ) : (
                <div className="mentor-placeholder" aria-label="Chân dung đang cập nhật">
                  <span>{mentor.initials}</span>
                  <UserRound size={90} strokeWidth={0.65} aria-hidden="true" />
                  <small>CHÂN DUNG ĐANG CẬP NHẬT</small>
                </div>
              )}
              <span className="mentor-portrait-label">
                {mentor.demo ? 'HỒ SƠ MINH HỌA' : 'KISTEIN DO'}
              </span>
            </div>
            <div className="mentor-profile-copy">
              <h3>{mentor.name}</h3>
              <span className="mentor-role">{mentor.role}</span>
              <div className="mentor-specialties">
                {mentor.specialties.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <Quote className="mentor-quote-icon" size={23} aria-hidden="true" />
              <blockquote>{mentor.quote}</blockquote>
            </div>
          </article>
        ))}
      </div>
      <div className="mentor-team-bottom">
        <span>Cùng học. Cùng thử nghiệm. Cùng tạo nên điều mới.</span>
        <Link to="/pages/mentor-1vs1">
          Khám phá Mentor 1vs1 <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}

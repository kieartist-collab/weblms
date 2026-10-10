import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  FileText,
} from 'lucide-react';
import { RichText } from './RichText';

const pages = [
  {
    slug: 'huong-dan-mua-khoa-hoc',
    title: 'Hướng dẫn mua khóa học',
    label: 'BẮT ĐẦU HÀNH TRÌNH',
    subtitle: 'Từ chọn khóa học đến bài học đầu tiên.',
    description: 'Theo dõi từng bước đăng ký, thanh toán và nhận quyền truy cập khóa học của bạn.',
    icon: BookOpen,
    accent: 'cyan',
    section: 'Các bước thực hiện',
  },
  {
    slug: 'chinh-sach-bao-hanh',
    title: 'Chính sách bảo hành',
    label: 'ĐỒNG HÀNH KHI BẠN HỌC',
    subtitle: 'Hỗ trợ rõ ràng. Học tập an tâm.',
    description:
      'Thông tin hỗ trợ truy cập, tài liệu và cách liên hệ khi bạn gặp vấn đề trong quá trình học.',
    icon: ShieldCheck,
    accent: 'green',
    section: 'Phạm vi & cách nhận hỗ trợ',
  },
  {
    slug: 'chinh-sach-hoan-tien',
    title: 'Chính sách hoàn tiền',
    label: 'THÔNG TIN THANH TOÁN',
    subtitle: 'Hiểu rõ trước khi quyết định.',
    description:
      'Xem hướng dẫn gửi yêu cầu và các thông tin cần trao đổi khi có vấn đề với thanh toán.',
    icon: Wallet,
    accent: 'purple',
    section: 'Thông tin cần biết',
  },
  {
    slug: 'mentor-1vs1',
    title: 'Mentor 1vs1',
    label: 'TRAO ĐỔI TRỰC TIẾP',
    subtitle: 'Một mục tiêu riêng. Một hướng đi phù hợp.',
    description: 'Trao đổi cùng Kistein Do về kỹ năng 3D, sản phẩm và dự án bạn đang theo đuổi.',
    icon: GraduationCap,
    accent: 'amber',
    section: 'Cùng xây dựng buổi mentor của bạn',
  },
];
// Plain-text paragraphs become cards. Rich content keeps its exact authored hierarchy.
export function contentBlocks(body: string) {
  if (body.startsWith('<!--lms-rich-v1-->')) return null;
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
export function InformationPage({ page }: { page: { slug: string; title: string; body: string } }) {
  const config = pages.find((p) => p.slug === page.slug) ?? pages[0];
  const Icon = config.icon;
  const blocks = useMemo(() => contentBlocks(page.body), [page.body]);
  const isGuide = page.slug === 'huong-dan-mua-khoa-hoc';
  const isMentor = page.slug === 'mentor-1vs1';
  const icons = isGuide
    ? [UserRound, BookOpen, CreditCard, CheckCircle2, GraduationCap, LifeBuoy]
    : isMentor
      ? [UserRound, Sparkles, FileText, MessageCircle]
      : [ShieldCheck, FileText, MessageCircle, CheckCircle2];
  return (
    <article className={`info-experience info-${config.accent}`}>
      <div className="info-shell">
        <nav className="info-breadcrumb" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>{page.title}</span>
        </nav>
        <header className="info-hero">
          <div className="info-hero-copy">
            <span className="info-eyebrow">
              <Icon size={16} />
              {config.label}
            </span>
            <h1>{page.title}</h1>
            <h2>{config.subtitle}</h2>
            <p>{config.description}</p>
            <a className="info-primary" href="#information-content">
              {isGuide ? 'Xem các bước' : isMentor ? 'Tìm hiểu mentor' : 'Xem chi tiết'}
              <ArrowRight size={17} />
            </a>
          </div>
          <figure className="info-portrait-figure">
            <div className="info-visual info-portrait-visual">
              <div className="info-orbit orbit-one" aria-hidden="true" />
              <div className="info-orbit orbit-two" aria-hidden="true" />
              <img className="info-portrait" src="/images/kistein-do.png" alt="Chân dung Kistein Do" width="1300" height="1210" />
              <span className="info-dot dot-one" aria-hidden="true" />
              <span className="info-dot dot-two" aria-hidden="true" />
            </div>
            <figcaption className="info-portrait-caption">
              <strong>Kistein Do</strong><span>CG Generalist</span>
            </figcaption>
          </figure>
        </header>
        <div className="info-layout">
          <aside className="info-navigation">
            <span className="info-side-label">TRONG TRANG NÀY</span>
            <a href="#information-content">
              <FileText size={16} />
              {config.section}
            </a>
            <a href="#information-contact">
              <MessageCircle size={16} />
              Liên hệ hỗ trợ
            </a>
            <div className="info-side-divider" />
            <span className="info-side-label">THÔNG TIN HỮU ÍCH</span>
            {pages.map((p) => (
              <Link
                key={p.slug}
                aria-current={p.slug === page.slug ? 'page' : undefined}
                to={`/pages/${p.slug}`}
              >
                <p.icon size={17} />
                <span>{p.title}</span>
                <ChevronRight size={14} />
              </Link>
            ))}
          </aside>
          <div className="info-main">
            <section id="information-content" className="info-content-section">
              <div className="info-section-heading">
                <span className="info-eyebrow">
                  {isGuide ? 'TỪNG BƯỚC RÕ RÀNG' : 'NỘI DUNG CHI TIẾT'}
                </span>
                <h2>{config.section}</h2>
              </div>
              {blocks ? (
                <div className={isGuide ? 'info-steps' : 'info-cards'}>
                  {blocks.map((block, index) => {
                    const BlockIcon = icons[index % icons.length];
                    const numbered = /^\d+[.)]\s/.test(block);
                    return (
                      <div
                        className={`info-content-card ${isGuide && numbered ? 'is-step' : ''}`}
                        key={index}
                      >
                        <div className="info-card-icon">
                          {isGuide && numbered ? (
                            <span>{String(index + 1).padStart(2, '0')}</span>
                          ) : (
                            <BlockIcon size={24} strokeWidth={1.6} />
                          )}
                        </div>
                        <RichText value={numbered ? block.replace(/^\d+[.)]\s*/, '') : block} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="info-authored">
                  <RichText value={page.body} />
                </div>
              )}
            </section>
            <section id="information-contact" className="info-contact">
              <div className="info-contact-heading">
                <span className="info-eyebrow">
                  <LifeBuoy size={16} />
                  KẾT NỐI TRỰC TIẾP
                </span>
                <h2>{isMentor ? 'Bắt đầu từ mục tiêu của bạn.' : 'Bạn cần trao đổi thêm?'}</h2>
                <p>
                  {isMentor
                    ? 'Gửi mục tiêu và sản phẩm hiện tại để trao đổi về buổi mentor phù hợp.'
                    : 'Liên hệ Kistein Do để được hướng dẫn về khóa học và yêu cầu của bạn.'}
                </p>
              </div>
              <div className="info-contact-grid">
                <a href="https://zalo.me/0902222612" target="_blank" rel="noopener noreferrer">
                  <Phone size={22} />
                  <span>
                    Zalo / Điện thoại<strong>090.222.2612</strong>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
                <a href="mailto:kieartist@gmail.com">
                  <Mail size={22} />
                  <span>
                    Email<strong>kieartist@gmail.com</strong>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              </div>
              <a
                className="info-messenger"
                href="https://m.me/kieartist"
                target="_blank"
                rel="noopener noreferrer"
              >
                Nhắn tin Messenger
                <MessageCircle size={18} />
                <ArrowUpRight size={16} />
              </a>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}

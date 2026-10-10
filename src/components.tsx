import { useEffect, useRef, useState } from 'react';
import type { DependencyList, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  LoaderCircle,
  AlertCircle,
  Check,
  GraduationCap,
  Film, Star, Users, CircleHelp, LayoutDashboard, LibraryBig,
} from 'lucide-react';
import { useAuth } from './auth';
import { db, demo, errorText, money, safeUrl } from './lib';
import type { Course } from './types';
import { SiteFooter } from './SiteFooter';

export function useLoad<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(undefined);
    ref
      .current()
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Dependencies supplied by callers include all query identities.
  }, [...deps, version]);
  return { data, error, loading, refresh: () => setVersion((v) => v + 1) };
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} /> Đang tải…
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <BookOpen size={32} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Action({
  children,
  onClick,
  className = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => Promise<unknown>;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  return (
    <div className="action">
      <button
        className={className}
        disabled={busy || disabled}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          try {
            await onClick();
          } catch (e) {
            setError(errorText(e));
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {busy && <LoaderCircle size={16} className="spin" />}
        {children}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const previousCourse = previousPath.current.match(/^\/learn\/([^/]+)/)?.[1];
    const currentCourse = location.pathname.match(/^\/learn\/([^/]+)/)?.[1];
    previousPath.current = location.pathname;
    setOpen(false);
    if (previousCourse && previousCourse === currentCourse && !location.hash) return;
    if (location.hash) {
      const timer = window.setTimeout(
        () =>
          document.getElementById(location.hash.slice(1))?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          }),
        100,
      );
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash, location.key]);
  if (location.pathname.startsWith('/learn/')) {
    return (
      <main id="main" className="learning-route">
        {children}
      </main>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <GraduationCap size={23} />
            </span>
            <span>
              học viện<span className="brand-sub">ONLINE</span>
            </span>
          </Link>
          <button
            className="mobile-toggle icon-button"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav className={open ? 'nav open' : 'nav'} aria-label="Điều hướng chính">
            {[
              { hash: 'courses', label: 'Khóa học', Icon: BookOpen },
              { hash: 'student-work', label: 'Sản phẩm học viên', Icon: Film },
              { hash: 'reviews', label: 'Đánh giá', Icon: Star },
              { hash: 'author', label: 'Tác giả', Icon: Users },
              { hash: 'faq', label: 'FAQ', Icon: CircleHelp },
            ].map(({ hash, label, Icon }) => {
              const selected = (location.pathname === '/' && location.hash === `#${hash}`) || (hash === 'courses' && location.pathname.startsWith('/courses'));
              return <Link key={hash} to={`/#${hash}`} className={selected ? 'active' : undefined} aria-current={selected ? 'location' : undefined}>
                <Icon size={16} aria-hidden="true" /><span>{label}</span>
              </Link>;
            })}
            <NavLink to="/my-learning"><LibraryBig size={16} aria-hidden="true" /><span>Góc học tập</span></NavLink>
            {profile?.is_admin && <NavLink to="/admin"><LayoutDashboard size={16} aria-hidden="true" /><span>Quản trị</span></NavLink>}
            <div className="nav-auth">
              {user ? (
                <>
                  <span className="user-name" title={user.email}>
                    {profile?.full_name || user.email}
                  </span>
                  <Action
                    className="icon-button"
                    onClick={async () => {
                      const { error } = await db().auth.signOut();
                      if (error) throw error;
                    }}
                  >
                    <LogOut size={19} />
                    <span className="sr-only">Đăng xuất</span>
                  </Action>
                </>
              ) : (
                <Link className="button small" to="/login">
                  Đăng nhập <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
      {demo && (
        <div className="demo-bar">
          Bản xem trước · Nội dung khóa học là dữ liệu mẫu.{' '}
          <Link to="/setup">Kết nối Supabase để bắt đầu</Link>
        </div>
      )}
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
export function CourseImage({ course, className = '' }: { course: Course; className?: string }) {
  const [failed, setFailed] = useState(false);
  return course.thumbnail_url && !failed ? (
    <img
      className={className}
      src={
        course.thumbnail_url.startsWith('/') ? course.thumbnail_url : safeUrl(course.thumbnail_url)
      }
      onError={() => setFailed(true)}
      alt={course.title}
      loading="lazy"
    />
  ) : (
    <div className={`course-placeholder ${className}`}>
      <span>{course.category}</span>
      <strong>
        Học.
        <br />
        Làm.
        <br />
        Sáng tạo.
      </strong>
      <BookOpen size={36} />
    </div>
  );
}
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link to={`/courses/${course.slug}`} className="course-card">
      <div className="card-cover">
        <CourseImage course={course} />
        <span className="cover-tag">{course.category}</span>
        <span className="cover-open">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="card-body">
        <span className="eyebrow muted">{course.level}</span>
        <h3>{course.title}</h3>
        {course.under_construction && (
          <span className="badge course-building">Đang được xây dựng</span>
        )}
        <div className="card-footer">
          <strong>{money(course.price)}</strong>
          <span>
            Xem khóa học <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="check-item">
      <span>
        <Check size={15} />
      </span>
      {children}
    </div>
  );
}
export function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, profile, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!user)
    return (
      <div className="container page">
        <Empty title={demo ? 'Kết nối tài khoản để dùng tính năng này' : 'Đăng nhập để tiếp tục'}>
          <p>
            {demo
              ? 'Bản xem trước chưa kết nối dữ liệu. Không có tài khoản hay giao dịch thật được tạo.'
              : 'Sử dụng email Google sẽ được cấp quyền xem bài học.'}
          </p>
          <Link
            className="button"
            to={demo ? '/setup' : `/login?next=${encodeURIComponent(location.pathname)}`}
          >
            {demo ? 'Hướng dẫn kết nối' : 'Đăng nhập Google'}
          </Link>
        </Empty>
      </div>
    );
  if (admin && !profile?.is_admin)
    return (
      <div className="container page">
        <Notice error>Bạn không có quyền quản trị.</Notice>
      </div>
    );
  return <>{children}</>;
}

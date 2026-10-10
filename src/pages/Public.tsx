import { curriculumLabels } from '../curriculum-labels';
import { SoftwareStrip } from '../SoftwareStrip';
import { MentorTeam } from '../MentorTeam';
import { RichText } from '../RichText';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Play, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { HomeSections } from '../HomeSections';
import { MotionSurface } from '../MotionSurface';
import { SpiralHero } from '../SpiralHero';
import { CourseAudience } from '../CourseAudience';
import { useAuth } from '../auth';
import {
  Action,
  CheckItem,
  CourseCard,
  CourseImage,
  Empty,
  Loading,
  Notice,
  useLoad,
} from '../components';
import { check, db, demo, money } from '../lib';
import { demoCourses, demoLessons, demoModules } from '../demo';
import type { Course, Lesson, Module } from '../types';

async function courses() {
  return demo
    ? demoCourses
    : (check(
        await db()
          .from('courses')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false }),
      ) as Course[]);
}
export function Home({ catalog = false }: { catalog?: boolean }) {
  const { data, error, loading, refresh } = useLoad(courses);

  return (
    <MotionSurface ready={!loading}>
      {!catalog && <SpiralHero />}
      {!catalog && (
        <div className="workflow-band">
          <div className="container">
            <div>
              <strong>
                01<span>/</span>
              </strong>
              <span>CHỌN KỸ NĂNG</span>
            </div>
            <div>
              <strong>
                02<span>/</span>
              </strong>
              <span>HỌC & THỰC HÀNH</span>
            </div>
            <div>
              <strong>
                03<span>/</span>
              </strong>
              <span>TẠO SẢN PHẨM</span>
            </div>
          </div>
        </div>
      )}
      <section className="container course-section" id="courses">
        <div className="section-heading">
          <div>
            <span className="eyebrow section-kicker">
              <BookOpen size={18} aria-hidden="true" /> COURSES / TRAINING
            </span>
            <h2>
              {catalog ? (
                'Chọn điều bạn muốn học.'
              ) : (
                <>
                  Từ nền tảng.
                  <br />
                  <em>Đến khả năng mới.</em>
                </>
              )}
            </h2>
          </div>
          {!catalog && (
            <Link to="/courses" className="text-link">
              Xem tất cả <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Notice error>
            {error} <button onClick={refresh}>Thử lại</button>
          </Notice>
        ) : data?.length ? (
          <div className="course-grid">
            {data.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <Empty title="Khóa học đang được chuẩn bị" />
        )}
      </section>
      {!catalog && (
        <section className="idea-cta" aria-labelledby="idea-cta-title">
          <div className="container idea-cta-inner">
            <h2 id="idea-cta-title">
              <span>Chúng tôi không đào tạo người sử dụng công cụ.</span>
              Chúng tôi đào tạo người <em>làm chủ ý tưởng.</em>
            </h2>
            <Link to="/#courses" className="button idea-cta-button">
              Chọn khóa học <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
      {!catalog && <CourseAudience />}
      {!catalog && <SoftwareStrip />}
      {!catalog && <HomeSections />}
      {!catalog && (
        <section className="closing-cta">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>
            Bắt đầu hành trình
            <br />
            <em>sáng tạo của bạn.</em>
          </h2>
          <Link className="button" to="/courses">
            Khám phá khóa học
          </Link>
        </section>
      )}
    </MotionSurface>
  );
}
export function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useLoad(async () => {
    const course = demo
      ? demoCourses.find((c) => c.slug === slug)
      : (check(
          await db().from('courses').select('*').eq('slug', slug!).maybeSingle(),
        ) as Course | null);
    if (!course) return null;
    const modules = demo
      ? demoModules.filter((m) => m.course_id === course.id)
      : (check(
          await db().from('modules').select('*').eq('course_id', course.id).order('position').order('id'),
        ) as Module[]);
    const lessons = demo
      ? demoLessons.filter((l) => modules.some((m) => m.id === l.module_id))
      : modules.length
        ? (check(
            await db()
              .from('lessons')
              .select('*')
              .in(
                'module_id',
                modules.map((m) => m.id),
              )
              .order('position').order('id'),
          ) as Lesson[])
        : [];
    const access = user
      ? check(
          await db()
            .from('enrollments')
            .select('active')
            .eq('user_id', user.id)
            .eq('course_id', course.id)
            .maybeSingle(),
        )
      : null;
    return { course, modules, lessons, access };
  }, [slug, user?.id]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!data) return <Empty title="Không tìm thấy khóa học" />;
  const { course, modules, lessons, access } = data;
  const labels = curriculumLabels(modules, lessons);
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to="/courses">Khóa học</Link>
        <ChevronRight size={14} />
        <span>{course.category}</span>
      </div>
      <div className="detail-grid">
        <div>
          <span className="eyebrow">
            {course.category} · {course.level}
          </span>
          <h1 className="page-title">{course.title}</h1>
          {course.under_construction && (
            <p>
              <span className="badge course-building">Đang được xây dựng</span>
            </p>
          )}
          <RichText className="lead" value={course.summary} />
          <div className="detail-meta">
            <span>
              <BookOpen size={17} />
              {lessons.length} bài học
            </span>
            <span>
              <Clock size={17} />
              {lessons.reduce((s, l) => s + l.duration_minutes, 0)} phút
            </span>
            <span>{course.instructor}</span>
          </div>
          <section className="content-section">
            <h2 className="info-heading">
              <BookOpen size={22} aria-hidden="true" /> Về khóa học
            </h2>
            <RichText value={course.description} />
          </section>
          <section className="content-section">
            <h2 className="info-heading">
              <Play size={22} aria-hidden="true" /> Nội dung chương trình
            </h2>
            {modules.length ? (
              modules.map((m, i) => (
                <details className="curriculum" key={m.id} open={i === 0}>
                  <summary>
                    {labels.chapters.get(m.id)}
                    <small>{lessons.filter((l) => l.module_id === m.id).length} bài</small>
                  </summary>
                  {lessons
                    .filter((l) => l.module_id === m.id)
                    .map((l) => (
                      <div className="curriculum-lesson" key={l.id}>
                        <Play size={15} />
                        <span>{labels.lessons.get(l.id)}</span>
                        <small>{l.duration_minutes} phút</small>
                      </div>
                    ))}
                </details>
              ))
            ) : (
              <p className="muted">Chương trình đang được cập nhật.</p>
            )}
          </section>
        </div>
        <aside className="purchase-card">
          <CourseImage course={course} />
          <div className="purchase-body">
            <span className="eyebrow">ĐẦU TƯ CHO CHÍNH BẠN</span>
            <strong className="price">{money(course.price)}</strong>
            {access?.active ? (
              <Link className="button full" to={`/learn/${course.id}`}>
                Vào học <Play size={17} />
              </Link>
            ) : course.under_construction ? (
              <button type="button" className="button full course-purchase-disabled" disabled>
                Đăng ký khóa học
              </button>
            ) : (
              <Action
                className="button full"
                onClick={async () => {
                  if (demo) {
                    navigate('/setup');
                    return;
                  }
                  if (!user) {
                    navigate(`/login?next=${encodeURIComponent(`/courses/${slug}`)}`);
                    return;
                  }
                  const o = check(await db().rpc('create_order', { p_course: course.id }));
                  navigate(`/orders/${o.id}`);
                }}
              >
                Đăng ký khóa học <ArrowUpRight size={18} />
              </Action>
            )}
            <p className="purchase-hint">
              {course.under_construction
                ? 'Đang được xây dựng · Chưa mở đăng ký'
                : 'Chuyển khoản · Admin xác nhận và cấp quyền'}
            </p>
            <div className="divider" />
            <CheckItem>Học theo thời gian của bạn</CheckItem>
            <CheckItem>Lưu tiến độ từng bài học</CheckItem>
            <CheckItem>Video và tài liệu qua Google Drive</CheckItem>
            <p className="small-note">
              Sử dụng cùng một email Google để đăng nhập và nhận quyền xem video.
            </p>
          </div>
        </aside>
      </div>
      <MentorTeam embedded />
    </div>
  );
}
export function Login() {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const raw = params.get('next') || sessionStorage.getItem('login-next') || '/my-learning';
  const next =
    /^\/(?![\/\\])/.test(raw) && !raw.startsWith('/login') && !raw.startsWith('/auth/')
      ? raw
      : '/my-learning';
  const oauthError =
    params.get('error_description') ||
    new URLSearchParams(window.location.hash.slice(1)).get('error_description');
  useEffect(() => {
    if (user && !loading && !error) {
      sessionStorage.removeItem('login-next');
      navigate(next, { replace: true });
    }
  }, [user, loading, error, next, navigate]);
  return (
    <div className="container page">
      <div className="auth-card">
        <span className="brand-icon">
          <BookOpen />
        </span>
        <span className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</span>
        <h1>
          Tiếp tục hành trình
          <br />
          của bạn.
        </h1>
        <p>Đăng nhập bằng tài khoản Google bạn muốn dùng để xem video và nhận tài liệu.</p>
        {demo ? (
          <>
            <Notice>
              Đây là bản xem trước. Hãy kết nối Supabase và Google OAuth để đăng nhập thật.
            </Notice>
            <Link to="/setup" className="button full">
              Hướng dẫn kết nối
            </Link>
          </>
        ) : (
          <Action
            className="button full google-button"
            onClick={async () => {
              sessionStorage.setItem('login-next', next);
              check(
                await db().auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: { prompt: 'select_account' },
                  },
                }),
              );
            }}
          >
            <span className="google-letter">G</span> Tiếp tục với Google
          </Action>
        )}
        {(error || oauthError) && <Notice error>{error || oauthError}</Notice>}
        <p className="small-note">
          Quyền học trên website và quyền xem Google Drive được giảng viên cấp sau khi xác nhận
          thanh toán.
        </p>
        <Link to="/courses" className="text-link">
          Quay lại khám phá khóa học
        </Link>
      </div>
    </div>
  );
}
export function Setup() {
  return (
    <div className="container page narrow">
      <span className="eyebrow">THIẾT LẬP LẦN ĐẦU</span>
      <h1 className="page-title">
        Đưa học viện của bạn
        <br />
        vào hoạt động.
      </h1>
      <p className="lead">
        Giao diện chạy trên máy. Dữ liệu, tài khoản và quyền học sử dụng Supabase của bạn.
      </p>
      <div className="panel setup-steps">
        <h2>1. Tạo dữ liệu</h2>
        <p>
          Tạo Supabase project Free. Trong SQL Editor, chạy lần lượt các file migration trong thư
          mục <code>supabase/migrations</code>, sau đó chạy <code>supabase/seed.sql</code> nếu muốn
          dùng dữ liệu mẫu.
        </p>
        <h2>2. Kết nối website</h2>
        <p>
          Sao chép <code>.env.example</code> thành <code>.env.local</code>, điền Project URL và
          publishable/anon key. Khởi động lại website. Tuyệt đối không dùng service role key.
        </p>
        <h2>3. Bật đăng nhập Google</h2>
        <p>
          Tạo Google OAuth client, cấu hình callback Supabase, bật Google trong Authentication và
          cho phép redirect về <code>http://127.0.0.1:5173/auth/callback</code> và{' '}
          <code>http://localhost:5173/auth/callback</code>.
        </p>
        <h2>4. Thiết lập admin</h2>
        <p>
          Đăng nhập Google một lần. Chạy câu lệnh cấp admin cho đúng email trong README bằng SQL
          Editor, rồi tải lại trang. Nhập thông tin ngân hàng và nội dung khóa học trong Quản trị.
        </p>
        <Notice>
          Hướng dẫn đầy đủ, kiểm thử và quy trình chia sẻ/thu hồi Drive nằm trong file README.md của
          dự án.
        </Notice>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  FileText,
  Play,
} from 'lucide-react';
import { useAuth } from '../auth';
import { Action, CourseImage, Empty, Loading, Notice, useLoad } from '../components';
import { check, date, db, driveId, money, orderLabels, safeUrl } from '../lib';
import type {
  Course,
  Enrollment,
  Lesson,
  LessonContent,
  Module,
  Order,
  Progress,
  Resource,
  Settings,
} from '../types';

export function MyLearning() {
  const { user } = useAuth();
  const { data, loading, error } = useLoad(async () => {
    const [enrollments, orders, courses, progress, modules, lessons] = await Promise.all([
      db().from('enrollments').select('*').eq('user_id', user!.id),
      db()
        .from('orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false }),
      db().from('courses').select('*'),
      db().from('progress').select('*').eq('user_id', user!.id),
      db().from('modules').select('*'),
      db().from('lessons').select('*').order('position'),
    ]);
    return {
      enrollments: check(enrollments) as Enrollment[],
      orders: check(orders) as Order[],
      courses: check(courses) as Course[],
      progress: check(progress) as Progress[],
      modules: check(modules) as Module[],
      lessons: check(lessons) as Lesson[],
    };
  }, [user!.id]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!data) return null;
  return (
    <div className="container page">
      <span className="eyebrow">GÓC HỌC TẬP</span>
      <h1 className="page-title">Hôm nay, học thêm một chút.</h1>
      <p className="lead">Mỗi bước nhỏ đều đưa bạn đến gần mục tiêu hơn.</p>
      <section className="content-section">
        <h2>Khóa học của tôi</h2>
        {data.enrollments.length ? (
          <div className="course-grid">
            {data.enrollments.map((e) => {
              const c = data.courses.find((c) => c.id === e.course_id);
              const ls = data.lessons.filter((l) =>
                data.modules.some((m) => m.id === l.module_id && m.course_id === e.course_id),
              );
              const completed = data.progress.filter(
                (p) => p.completed && ls.some((l) => l.id === p.lesson_id),
              ).length;
              const percent = ls.length ? Math.round((completed / ls.length) * 100) : 0;
              const last = [...data.progress]
                .filter((p) => ls.some((l) => l.id === p.lesson_id))
                .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))[0];
              return (
                <article className="course-card" key={e.course_id}>
                  {c && (
                    <div className="card-cover">
                      <CourseImage course={c} />
                    </div>
                  )}
                  <div className="card-body">
                    <h3>{c?.title || 'Khóa học chưa xuất bản'}</h3>
                    {e.active && c?.published ? (
                      <>
                        <div className="progress-caption">
                          <span>
                            {completed}/{ls.length} bài hoàn thành
                          </span>
                          <strong>{percent}%</strong>
                        </div>
                        <progress value={percent} max={100} />
                        <Link
                          className="button full"
                          to={`/learn/${e.course_id}${last ? `/${last.lesson_id}` : ''}`}
                        >
                          {last ? 'Tiếp tục học' : 'Bắt đầu học'} <Play size={16} />
                        </Link>
                      </>
                    ) : (
                      <Notice>
                        {e.active
                          ? 'Giảng viên đang cập nhật khóa học.'
                          : 'Quyền học đã được thu hồi. Liên hệ giảng viên để được hỗ trợ.'}
                      </Notice>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="Hành trình của bạn bắt đầu ở đây">
            <p>Khóa học sẽ xuất hiện sau khi admin xác nhận thanh toán và cấp quyền.</p>
            <Link to="/courses" className="button">
              Khám phá khóa học
            </Link>
          </Empty>
        )}
      </section>
      <section className="content-section">
        <h2>Đơn hàng của tôi</h2>
        {data.orders.length ? (
          <div className="order-list">
            {data.orders.map((o) => (
              <Link className="order-row" to={`/orders/${o.id}`} key={o.id}>
                <BookOpen size={23} />
                <div>
                  <strong>
                    {data.courses.find((c) => c.id === o.course_id)?.title || 'Khóa học'}
                  </strong>
                  <small>
                    {date(o.created_at)} · {money(o.amount)}
                  </small>
                </div>
                <span className={`badge ${o.status}`}>{orderLabels[o.status]}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">Bạn chưa có đơn hàng nào.</p>
        )}
      </section>
    </div>
  );
}
export function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useLoad(async () => {
    const order = check(
      await db().from('orders').select('*').eq('id', id!).eq('user_id', user!.id).maybeSingle(),
    ) as Order | null;
    if (!order) return null;
    const [c, s, e] = await Promise.all([
      db().from('courses').select('*').eq('id', order.course_id).maybeSingle(),
      db().from('settings').select('*').eq('id', 1).single(),
      db()
        .from('enrollments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('course_id', order.course_id)
        .maybeSingle(),
    ]);
    return {
      order,
      course: check(c) as Course | null,
      settings: check(s) as Settings,
      enrollment: check(e) as Enrollment | null,
    };
  }, [id, user!.id]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!data) return <Empty title="Không tìm thấy đơn hàng" />;
  const { order: o, course: c, settings: s, enrollment: e } = data;
  const qr = ['pending', 'reported'].includes(o.status) ? safeUrl(s.bank_qr_url) : '';
  return (
    <div className="container page checkout-page">
      <Link className="text-link" to="/my-learning">
        <ChevronLeft size={16} /> Góc học tập
      </Link>
      <h1 className="page-title">Đăng ký khóa học</h1>
      <p className="lead">{c?.title || 'Khóa học'}</p>
      <div className={`checkout-layout ${qr ? 'has-qr' : ''}`}>
      <div className="panel checkout-information">
        <div className="panel-heading">
          <h2>{money(o.amount)}</h2>
          <span className={`badge ${o.status}`}>{orderLabels[o.status]}</span>
        </div>
        <p>
          Email nhận quyền: <strong>{user?.email}</strong>
        </p>
        {['pending', 'reported'].includes(o.status) && (
          <>
            <div className="bank-details">
              <div>
                <small>Ngân hàng</small>
                <strong>{s.bank_name}</strong>
              </div>
              <div>
                <small>Số tài khoản</small>
                <strong>{s.bank_account}</strong>
              </div>
              <div>
                <small>Chủ tài khoản</small>
                <strong>{s.bank_owner}</strong>
              </div>
              <div>
                <small>Nội dung chuyển khoản (sao chép đầy đủ)</small>
                <code>{o.transfer_code}</code>
                <Action
                  className="button secondary small"
                  onClick={async () => {
                    await navigator.clipboard.writeText(o.transfer_code);
                  }}
                >
                  Sao chép mã
                </Action>
              </div>
            </div>
            <Notice>
              Chuyển đúng số tiền và nội dung ở trên. Nút báo chuyển khoản không tự xác nhận thanh
              toán hoặc cấp quyền học.
            </Notice>
            {o.status === 'pending' && (
              <Action
                onClick={async () => {
                  check(await db().rpc('report_payment', { p_order: o.id }));
                  refresh();
                }}
              >
                Tôi đã chuyển khoản
              </Action>
            )}
          </>
        )}
        {o.status === 'reported' && (
          <p>Yêu cầu của bạn đang chờ admin kiểm tra. Bạn có thể quay lại đây để xem trạng thái.</p>
        )}
        {o.status === 'paid' && (
          <Notice>
            Đã xác nhận thanh toán. Admin đang chia sẻ folder Drive cho email của bạn trước khi mở
            khóa học.
          </Notice>
        )}
        {o.status === 'fulfilled' &&
          (e?.active ? (
            <>
              <Notice>
                Khóa học đã sẵn sàng. Đăng nhập đúng email Google ở trên khi mở video.
              </Notice>
              <Link className="button" to={`/learn/${o.course_id}`}>
                Vào học <Play size={16} />
              </Link>
            </>
          ) : (
            <Notice>
              Đơn đã được xử lý nhưng quyền học hiện không hoạt động. Liên hệ giảng viên để được hỗ
              trợ.
            </Notice>
          ))}
        {o.status === 'cancelled' && (
          <Notice>
            Đơn hàng đã hủy. Nếu đã chuyển khoản, hãy liên hệ giảng viên để đối soát trước khi tạo
            đơn mới.
          </Notice>
        )}
        <button className="text-link refresh" onClick={refresh}>
          Cập nhật trạng thái
        </button>
      </div>
      {qr && <aside className="panel checkout-qr-panel" aria-label="Mã QR thanh toán">
        <h2>Quét mã chuyển khoản</h2>
        <img className="bank-qr checkout-bank-qr" src={qr} alt="Mã QR chuyển khoản do admin cung cấp" />
        <p className="muted">Nhập đúng số tiền và nội dung chuyển khoản ở cột thông tin.</p>
      </aside>}
      </div>
    </div>
  );
}
export function Learning() {
  const { courseId, lessonId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const { data, loading, error, refresh } = useLoad(async () => {
    const course = check(
      await db().from('courses').select('*').eq('id', courseId!).maybeSingle(),
    ) as Course | null;
    const access = check(
      await db()
        .from('enrollments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('course_id', courseId!)
        .maybeSingle(),
    ) as Enrollment | null;
    if (!course || (!access?.active && !profile?.is_admin)) return null;
    const modules = check(
      await db().from('modules').select('*').eq('course_id', courseId!).order('position'),
    ) as Module[];
    const lessons = modules.length
      ? (check(
          await db()
            .from('lessons')
            .select('*')
            .in(
              'module_id',
              modules.map((m) => m.id),
            )
            .order('position'),
        ) as Lesson[])
      : [];
    const progress = check(
      await db().from('progress').select('*').eq('user_id', user!.id),
    ) as Progress[];
    const lesson = lessonId
      ? lessons.find((l) => l.id === lessonId)
      : modules.flatMap((m) => lessons.filter((l) => l.module_id === m.id))[0];
    const content = lesson
      ? (check(
          await db().from('lesson_contents').select('*').eq('lesson_id', lesson.id).maybeSingle(),
        ) as LessonContent | null)
      : null;
    const resources = lesson
      ? (check(await db().from('resources').select('*').eq('lesson_id', lesson.id)) as Resource[])
      : [];
    return { course, access, modules, lessons, progress, lesson, content, resources };
  }, [courseId, lessonId, user!.id, profile?.is_admin]);
  useEffect(() => {
    if (!data?.lesson || !data.content) return;
    let alive = true;
    setNotice('');
    db()
      .rpc('record_progress', { p_lesson: data.lesson.id })
      .then(({ error }) => {
        if (error && alive) setNotice(error.message);
      });
    return () => {
      alive = false;
    };
  }, [data?.lesson?.id, data?.content]);
  useEffect(() => {
    let alive = true;
    const verify = async () => {
      if (profile?.is_admin) return;
      const { data: e, error: err } = await db()
        .from('enrollments')
        .select('active')
        .eq('user_id', user!.id)
        .eq('course_id', courseId!)
        .maybeSingle();
      if (alive && !err && !e?.active) navigate('/my-learning', { replace: true });
    };
    const timer = window.setInterval(() => void verify(), 30000);
    window.addEventListener('focus', verify);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', verify);
    };
  }, [courseId, user, profile?.is_admin, navigate]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!data)
    return (
      <div className="container page">
        <Empty title="Bạn chưa có quyền học khóa này">
          <p>Khóa học có thể chưa xuất bản hoặc quyền truy cập chưa được cấp.</p>
          <Link to="/my-learning" className="button">
            Về góc học tập
          </Link>
        </Empty>
      </div>
    );
  const { course, modules, lessons, progress, lesson, content, resources } = data;
  const done = progress.filter(
    (p) => p.completed && lessons.some((l) => l.id === p.lesson_id),
  ).length;
  const completed = progress.find((p) => p.lesson_id === lesson?.id)?.completed;
  const video = driveId(content?.video_url || '');
  const ordered = modules.flatMap((m) => lessons.filter((l) => l.module_id === m.id));
  const next = ordered[ordered.findIndex((l) => l.id === lesson?.id) + 1];
  return (
    <div className="classroom">
      <aside className="lesson-sidebar">
        <Link to="/my-learning" className="text-link">
          <ChevronLeft size={16} /> Góc học tập
        </Link>
        <h2>{course.title}</h2>
        <div className="progress-caption">
          <span>Tiến độ của bạn</span>
          <strong>
            {done}/{lessons.length} bài
          </strong>
        </div>
        <progress value={done} max={lessons.length || 1} />
        {modules.map((m, i) => (
          <div className="lesson-group" key={m.id}>
            <h3>
              {i + 1}. {m.title}
            </h3>
            {lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => (
                <Link
                  className={`lesson-link ${l.id === lesson?.id ? 'selected' : ''}`}
                  key={l.id}
                  to={`/learn/${courseId}/${l.id}`}
                >
                  {progress.find((p) => p.lesson_id === l.id)?.completed ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Play size={16} />
                  )}
                  <span>
                    {l.title}
                    <small>{l.duration_minutes} phút</small>
                  </span>
                </Link>
              ))}
          </div>
        ))}
      </aside>
      <section className="lesson-main">
        {lesson ? (
          <>
            <span className="eyebrow">{modules.find((m) => m.id === lesson.module_id)?.title}</span>
            <h1>{lesson.title}</h1>
            <div className="video-frame">
              {video ? (
                <iframe
                  key={video}
                  src={`https://drive.google.com/file/d/${video}/preview`}
                  title={lesson.title}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="video-empty">
                  <Play size={42} />
                  <p>Video đang được chuẩn bị</p>
                </div>
              )}
              {video && <div className="drive-popout-cover" aria-hidden="true" />}
            </div>
            <div className="video-help">
              <span>
                Đăng nhập Google bằng <strong>{user?.email}</strong> để xem video bài học.
              </span>

            </div>
            {notice && <Notice error>{notice}</Notice>}
            <div className="lesson-actions">
              <span className="muted inline">
                <Clock size={16} />
                {lesson.duration_minutes} phút
              </span>
              <Action
                onClick={async () => {
                  check(
                    await db().rpc('record_progress', {
                      p_lesson: lesson.id,
                      p_completed: !completed,
                    }),
                  );
                  refresh();
                }}
              >
                {completed ? (
                  <>
                    <CheckCircle2 size={17} /> Đã hoàn thành · Bỏ đánh dấu
                  </>
                ) : (
                  <>
                    Hoàn thành bài <CheckCircle2 size={17} />
                  </>
                )}
              </Action>
              {next && (
                <Link className="button secondary" to={`/learn/${courseId}/${next.id}`}>
                  Bài tiếp theo
                </Link>
              )}
            </div>
            <section className="content-section">
              <h2>Nội dung bài học</h2>
              <p className="prose">
                {content?.body || 'Giảng viên chưa bổ sung nội dung cho bài học này.'}
              </p>
            </section>
            {resources.length > 0 && (
              <section className="content-section">
                <h2>Tài liệu đi kèm</h2>
                {resources.map((r) => (
                  <a
                    className="resource"
                    key={r.id}
                    href={safeUrl(r.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={20} />
                    <span>{r.title}</span>
                    <ExternalLink size={16} />
                  </a>
                ))}
              </section>
            )}
          </>
        ) : (
          <Empty title="Bài học chưa có hoặc không thuộc khóa này" />
        )}
      </section>
    </div>
  );
}


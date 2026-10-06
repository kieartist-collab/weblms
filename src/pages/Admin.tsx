import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  CreditCard,
  Users,
  Settings as SettingsIcon,
  History,
  Plus,
  ExternalLink,
  ChevronLeft,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';
import { Action, Empty, Loading, Notice, useLoad } from '../components';
import {
  check,
  date,
  db,
  driveId,
  errorText,
  money,
  orderLabels,
  safeUrl,
  validDrive,
} from '../lib';
import type {
  Audit,
  Course,
  Enrollment,
  Lesson,
  LessonContent,
  Module,
  Order,
  Profile,
  Progress,
  Resource,
  Settings,
} from '../types';

export function Admin() {
  return (
    <div className="container page">
      <span className="eyebrow">KHÔNG GIAN GIẢNG VIÊN</span>
      <h1 className="page-title">Quản trị học viện</h1>
      <nav className="admin-tabs" aria-label="Quản trị">
        <NavLink to="/admin" end>
          <BookOpen size={17} />
          Khóa học
        </NavLink>
        <NavLink to="/admin/orders">
          <CreditCard size={17} />
          Đơn hàng
        </NavLink>
        <NavLink to="/admin/students">
          <Users size={17} />
          Học viên
        </NavLink>
        <NavLink to="/admin/settings">
          <SettingsIcon size={17} />
          Thanh toán
        </NavLink>
        <NavLink to="/admin/audit">
          <History size={17} />
          Nhật ký
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<AdminCourses />} />
        <Route path="courses/:id" element={<CourseEditor />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="settings" element={<BankSettings />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Empty title="Không tìm thấy trang quản trị" />} />
      </Routes>
    </div>
  );
}
function Field({
  label,
  name,
  value = '',
  type = 'text',
  required = false,
  multiline = false,
  hint,
  min,
  children,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
  min?: number;
  children?: ReactNode;
}) {
  return (
    <label className={`field ${multiline ? 'wide' : ''}`}>
      <span>{label}</span>
      {children ||
        (multiline ? (
          <textarea name={name} defaultValue={value} required={required} rows={5} />
        ) : (
          <input name={name} type={type} defaultValue={value} required={required} min={min} />
        ))}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function EditorForm({
  children,
  onSave,
  label = 'Lưu thay đổi',
}: {
  children: ReactNode;
  onSave: (data: FormData) => Promise<unknown>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      await onSave(data);
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="editor-form" onChange={() => setSaved(false)}>
      {children}
      {error && <Notice error>{error}</Notice>}
      <div className="form-actions">
        <button className="button" disabled={busy}>
          <Save size={17} />
          {busy ? 'Đang lưu…' : label}
        </button>
        {saved && (
          <span role="status" className="saved">
            Đã lưu thành công
          </span>
        )}
      </div>
    </form>
  );
}
const text = (f: FormData, k: string) => String(f.get(k) || '').trim();
function AdminCourses() {
  const { data, loading, error, refresh } = useLoad(
    async () =>
      check(
        await db().from('courses').select('*').order('created_at', { ascending: false }),
      ) as Course[],
  );
  return (
    <>
      <div className="section-heading">
        <h2>Khóa học của bạn</h2>
        <Link to="/admin/courses/new" className="button">
          <Plus size={18} />
          Tạo khóa học
        </Link>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>{c.category}</small>
                  </td>
                  <td>{money(c.price)}</td>
                  <td>
                    <span className={`badge ${c.published ? 'fulfilled' : 'pending'}`}>
                      {c.published ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </td>
                  <td>
                    <div className="inline">
                      <Link className="button secondary small" to={`/admin/courses/${c.id}`}>
                        <Pencil size={15} />
                        Sửa
                      </Link>
                      <Action
                        className="button secondary small"
                        onClick={async () => {
                          check(
                            await db()
                              .from('courses')
                              .update({ published: !c.published })
                              .eq('id', c.id),
                          );
                          refresh();
                        }}
                      >
                        {c.published ? 'Ẩn khóa học' : 'Xuất bản'}
                      </Action>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Tạo khóa học đầu tiên của bạn" />
      )}
    </>
  );
}
function Thumbnail({ value }: { value: string }) {
  const [url, setUrl] = useState(value);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="wide">
      <Field label="Ảnh khóa học (URL HTTPS)" name="thumbnail_url">
        <input
          type="url"
          name="thumbnail_url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>
      <label className="upload-label">
        {busy ? 'Đang tải ảnh…' : 'Hoặc tải ảnh JPG, PNG, WebP (tối đa 5 MB)'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError('');
            setBusy(true);
            try {
              if (f.size > 5242880 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
                throw new Error('Chỉ nhận JPG, PNG hoặc WebP tối đa 5 MB.');
              const ext = f.type.split('/')[1];
              const path = `${crypto.randomUUID()}.${ext}`;
              check(
                await db()
                  .storage.from('course-thumbnails')
                  .upload(path, f, { contentType: f.type }),
              );
              setUrl(db().storage.from('course-thumbnails').getPublicUrl(path).data.publicUrl);
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const { data, loading, error, refresh } = useLoad(async () => {
    if (isNew) return { course: null, folder: '' };
    const c = check(await db().from('courses').select('*').eq('id', id!).single()) as Course;
    const p = check(
      await db().from('course_private').select('*').eq('course_id', id!).maybeSingle(),
    );
    return { course: c, folder: p?.drive_folder_url || '' };
  }, [id]);
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  const c = data?.course;
  return (
    <>
      <Link to="/admin" className="text-link">
        <ChevronLeft size={16} />
        Danh sách khóa học
      </Link>
      <section className="panel content-section">
        <h2>{isNew ? 'Tạo khóa học' : c?.title}</h2>
        <EditorForm
          key={id}
          onSave={async (f) => {
            const thumb = text(f, 'thumbnail_url');
            if (thumb && !safeUrl(thumb)) throw new Error('Ảnh cần sử dụng URL HTTPS.');
            const values = {
              title: text(f, 'title'),
              slug: text(f, 'slug'),
              summary: text(f, 'summary'),
              description: text(f, 'description'),
              instructor: text(f, 'instructor'),
              category: text(f, 'category'),
              level: text(f, 'level'),
              price: Number(f.get('price')),
              thumbnail_url: thumb,
              published: f.get('published') === 'on',
            };
            if (isNew) {
              const row = check(await db().from('courses').insert(values).select().single());
              navigate(`/admin/courses/${row.id}`);
            } else check(await db().from('courses').update(values).eq('id', id!));
          }}
        >
          <div className="form-grid">
            <Field name="title" label="Tên khóa học" value={c?.title} required />
            <Field
              name="slug"
              label="Đường dẫn (chữ thường, không dấu)"
              value={c?.slug}
              required
              hint="Ví dụ: unreal-engine-co-ban"
            />
            <Field name="category" label="Danh mục" value={c?.category || 'Khóa học'} required />
            <Field name="level" label="Trình độ" value={c?.level || 'Từ cơ bản'} />
            <Field
              name="instructor"
              label="Giảng viên"
              value={c?.instructor || 'Học viện Online'}
              required
            />
            <Field
              name="price"
              label="Giá (VND)"
              type="number"
              min={0}
              value={c?.price || 0}
              required
            />
            <Field name="summary" label="Mô tả ngắn" value={c?.summary} multiline />
            <Field
              name="description"
              label="Giới thiệu chi tiết"
              value={c?.description}
              multiline
            />
            <Thumbnail value={c?.thumbnail_url || ''} />
          </div>
          <label className="checkbox">
            <input type="checkbox" name="published" defaultChecked={c?.published} />
            Xuất bản khóa học (bỏ chọn để lưu nháp)
          </label>
        </EditorForm>
      </section>
      {!isNew && (
        <>
          <section className="panel content-section">
            <h2>Folder Google Drive của khóa học</h2>
            <p className="muted">
              Chỉ admin nhìn thấy liên kết này. Chia sẻ folder ở chế độ Restricted, quyền Viewer,
              cho từng email đã thanh toán.
            </p>
            <EditorForm
              onSave={async (f) => {
                const url = text(f, 'drive_folder_url');
                if (
                  url &&
                  !/^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[\w-]+/.test(url)
                )
                  throw new Error('Nhập link folder Google Drive hợp lệ.');
                check(
                  await db()
                    .from('course_private')
                    .upsert({ course_id: id, drive_folder_url: url }),
                );
              }}
            >
              <Field
                label="Liên kết folder"
                name="drive_folder_url"
                type="url"
                value={data?.folder}
              />
            </EditorForm>
          </section>
          <CurriculumEditor courseId={id!} onChange={refresh} />
        </>
      )}
    </>
  );
}
function CurriculumEditor({ courseId }: { courseId: string; onChange: () => void }) {
  const [edit, setEdit] = useState<Lesson | null | undefined>(undefined);
  const [newModule, setNewModule] = useState('');
  const { data, loading, error, refresh } = useLoad(async () => {
    const modules = check(
      await db().from('modules').select('*').eq('course_id', courseId).order('position'),
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
    return { modules, lessons };
  }, [courseId]);
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <section className="content-section">
      <h2>Chương và bài học</h2>
      <p className="muted">
        Thứ tự nhỏ hiển thị trước. Đặt các số khác nhau để sắp xếp chương và bài.
      </p>
      {data?.modules.map((m) => (
        <div className="panel module-editor" key={m.id}>
          <EditorForm
            label="Lưu chương"
            onSave={async (f) => {
              check(
                await db()
                  .from('modules')
                  .update({ title: text(f, 'title'), position: Number(f.get('position')) })
                  .eq('id', m.id),
              );
              refresh();
            }}
          >
            <div className="form-grid">
              <Field label="Tên chương" name="title" value={m.title} required />
              <Field label="Thứ tự" name="position" type="number" value={m.position} />
            </div>
          </EditorForm>
          <div className="module-lessons">
            {data.lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => (
                <div className="module-lesson" key={l.id}>
                  <span>
                    {l.position + 1}. {l.title}
                    <small>{l.duration_minutes} phút</small>
                  </span>
                  <button className="button secondary small" onClick={() => setEdit(l)}>
                    Sửa bài
                  </button>
                  <Action
                    className="icon-button danger"
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Xóa bài “${l.title}” cùng nội dung, tài liệu và tiến độ liên quan?`,
                        )
                      ) {
                        check(await db().from('lessons').delete().eq('id', l.id));
                        refresh();
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    <span className="sr-only">Xóa bài {l.title}</span>
                  </Action>
                </div>
              ))}
          </div>
          <div className="inline">
            <button
              className="button secondary small"
              onClick={() => {
                setNewModule(m.id);
                setEdit(null);
              }}
            >
              <Plus size={15} />
              Thêm bài học
            </button>
            <Action
              className="button danger small"
              onClick={async () => {
                if (
                  window.confirm(
                    `Xóa chương “${m.title}” và tất cả bài học, tài liệu, tiến độ bên trong?`,
                  )
                ) {
                  check(await db().from('modules').delete().eq('id', m.id));
                  refresh();
                }
              }}
            >
              Xóa chương
            </Action>
          </div>
        </div>
      ))}
      <div className="panel">
        <h3>Thêm chương mới</h3>
        <EditorForm
          key={`new-${data?.modules.length}`}
          label="Thêm chương"
          onSave={async (f) => {
            check(
              await db()
                .from('modules')
                .insert({
                  course_id: courseId,
                  title: text(f, 'title'),
                  position: Math.max(-1, ...(data?.modules.map((m) => m.position) || [])) + 1,
                }),
            );
            refresh();
          }}
        >
          <Field label="Tên chương" name="title" required />
        </EditorForm>
      </div>
      {edit !== undefined && (
        <LessonEditor
          key={edit?.id || `new-${newModule}`}
          lesson={edit}
          moduleId={edit?.module_id || newModule}
          position={
            Math.max(
              -1,
              ...(data?.lessons.filter((l) => l.module_id === newModule).map((l) => l.position) ||
                []),
            ) + 1
          }
          close={() => {
            setEdit(undefined);
            refresh();
          }}
        />
      )}
    </section>
  );
}
function LessonEditor({
  lesson,
  moduleId,
  position,
  close,
}: {
  lesson: Lesson | null;
  moduleId: string;
  position: number;
  close: () => void;
}) {
  const modal = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const elements = [
        ...(modal.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)',
        ) || []),
      ];
      const first = elements[0],
        last = elements.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === modal.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const [lessonKey] = useState(() => lesson?.id || crypto.randomUUID());
  const [saved, setSaved] = useState(!!lesson);
  const { data, error, loading } = useLoad(
    async () =>
      lesson
        ? (check(
            await db().from('lesson_contents').select('*').eq('lesson_id', lesson.id).maybeSingle(),
          ) as LessonContent | null)
        : null,
    [lesson?.id],
  );
  return (
    <div className="modal-backdrop">
      <section
        ref={modal}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chỉnh sửa bài học"
      >
        <div className="panel-heading">
          <h2>{lesson ? 'Chỉnh sửa bài học' : 'Thêm bài học'}</h2>
          <button className="button secondary small" onClick={close}>
            Đóng
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Notice error>{error}</Notice>
        ) : (
          <EditorForm
            onSave={async (f) => {
              const video = text(f, 'video_url');
              if (video && !driveId(video))
                throw new Error(
                  'Nhập link video Google Drive dạng /file/d/ID/view hoặc /open?id=ID.',
                );
              check(
                await db()
                  .from('lessons')
                  .upsert({
                    id: lessonKey,
                    module_id: moduleId,
                    title: text(f, 'title'),
                    position: Number(f.get('position')),
                    duration_minutes: Number(f.get('duration_minutes')),
                  }),
              );
              check(
                await db()
                  .from('lesson_contents')
                  .upsert({ lesson_id: lessonKey, body: text(f, 'body'), video_url: video }),
              );
              setSaved(true);
            }}
          >
            <div className="form-grid">
              <Field label="Tên bài học" name="title" value={lesson?.title} required />
              <Field
                label="Thời lượng (phút)"
                name="duration_minutes"
                type="number"
                min={0}
                value={lesson?.duration_minutes || 0}
              />
              <Field
                label="Thứ tự"
                name="position"
                type="number"
                value={lesson?.position ?? position}
              />
              <Field
                label="Video Google Drive"
                name="video_url"
                type="url"
                value={data?.video_url}
              />
              <Field label="Nội dung bài học (văn bản)" name="body" value={data?.body} multiline />
            </div>
          </EditorForm>
        )}
        {saved && <ResourceEditor lessonId={lessonKey} />}
      </section>
    </div>
  );
}
function ResourceEditor({ lessonId }: { lessonId: string }) {
  const { data, error, loading, refresh } = useLoad(
    async () =>
      check(await db().from('resources').select('*').eq('lesson_id', lessonId)) as Resource[],
    [lessonId],
  );
  return (
    <section className="content-section">
      <h3>Tài liệu bài học</h3>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : (
        data?.map((r) => (
          <div className="resource" key={r.id}>
            <a href={safeUrl(r.url)} target="_blank" rel="noreferrer">
              {r.title}
            </a>
            <Action
              className="icon-button danger"
              onClick={async () => {
                if (window.confirm(`Xóa liên kết tài liệu “${r.title}”?`)) {
                  check(await db().from('resources').delete().eq('id', r.id));
                  refresh();
                }
              }}
            >
              <Trash2 size={16} />
              <span className="sr-only">Xóa tài liệu</span>
            </Action>
          </div>
        ))
      )}
      <EditorForm
        key={data?.length}
        label="Thêm tài liệu"
        onSave={async (f) => {
          const url = text(f, 'url');
          if (!validDrive(url))
            throw new Error('Chỉ sử dụng link HTTPS Google Drive hoặc Google Docs.');
          check(
            await db()
              .from('resources')
              .insert({ lesson_id: lessonId, title: text(f, 'title'), url }),
          );
          refresh();
        }}
      >
        <Field label="Tên tài liệu" name="title" required />
        <Field label="Liên kết Google Drive / Docs" name="url" type="url" required />
      </EditorForm>
    </section>
  );
}
function AdminOrders() {
  const { data, error, loading, refresh } = useLoad(async () => {
    const [o, p, c, f] = await Promise.all([
      db().from('orders').select('*').order('created_at', { ascending: false }),
      db().from('profiles').select('*'),
      db().from('courses').select('*'),
      db().from('course_private').select('*'),
    ]);
    return {
      orders: check(o) as Order[],
      profiles: check(p) as Profile[],
      courses: check(c) as Course[],
      folders: check(f) as { course_id: string; drive_folder_url: string }[],
    };
  });
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <>
      <div className="section-heading">
        <h2>Đơn hàng & cấp quyền</h2>
        <button className="button secondary small" onClick={refresh}>
          Cập nhật
        </button>
      </div>
      <Notice>
        Đối soát ngân hàng trước khi xác nhận tiền. Chỉ cấp quyền sau khi bạn đã chia sẻ folder
        Drive cho đúng email học viên.
      </Notice>
      {!data?.orders.length ? (
        <Empty title="Chưa có đơn hàng" />
      ) : (
        data.orders.map((o) => {
          const p = data.profiles.find((p) => p.id === o.user_id);
          const folder = data.folders.find((f) => f.course_id === o.course_id)?.drive_folder_url;
          return (
            <article className="panel order-admin" key={o.id}>
              <div className="panel-heading">
                <h3>{data.courses.find((c) => c.id === o.course_id)?.title}</h3>
                <span className={`badge ${o.status}`}>{orderLabels[o.status]}</span>
              </div>
              <p>
                <strong>{p?.email}</strong> · {money(o.amount)} · {date(o.created_at)}
              </p>
              <code className="transfer-code">{o.transfer_code}</code>
              <div className="inline">
                {['pending', 'reported'].includes(o.status) && (
                  <>
                    <Action
                      onClick={async () => {
                        if (
                          window.confirm(`Đã nhận ${money(o.amount)} với mã ${o.transfer_code}?`)
                        ) {
                          check(
                            await db().rpc('admin_order_action', {
                              p_order: o.id,
                              p_action: 'confirm_payment',
                            }),
                          );
                          refresh();
                        }
                      }}
                    >
                      Xác nhận đã nhận tiền
                    </Action>
                    <Action
                      className="button secondary"
                      onClick={async () => {
                        if (window.confirm('Hủy đơn chưa xác nhận thanh toán này?')) {
                          check(
                            await db().rpc('admin_order_action', {
                              p_order: o.id,
                              p_action: 'cancel',
                            }),
                          );
                          refresh();
                        }
                      }}
                    >
                      Hủy đơn
                    </Action>
                  </>
                )}
                {o.status === 'paid' && (
                  <>
                    {folder && (
                      <a
                        className="button secondary"
                        href={safeUrl(folder)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở folder Drive <ExternalLink size={16} />
                      </a>
                    )}
                    <Action
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Bạn đã chia sẻ đúng folder cho ${p?.email} với quyền Viewer? Xác nhận để mở quyền học trên website.`,
                          )
                        ) {
                          check(
                            await db().rpc('admin_order_action', {
                              p_order: o.id,
                              p_action: 'grant_access',
                            }),
                          );
                          refresh();
                        }
                      }}
                    >
                      Đã chia sẻ Drive · Cấp quyền học
                    </Action>
                  </>
                )}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
function AdminStudents() {
  const { data, error, loading, refresh } = useLoad(async () => {
    const [p, e, c, pr, m, l, f] = await Promise.all([
      db().from('profiles').select('*'),
      db().from('enrollments').select('*'),
      db().from('courses').select('*'),
      db().from('progress').select('*'),
      db().from('modules').select('*'),
      db().from('lessons').select('*'),
      db().from('course_private').select('*'),
    ]);
    return {
      profiles: check(p) as Profile[],
      enrollments: check(e) as Enrollment[],
      courses: check(c) as Course[],
      progress: check(pr) as Progress[],
      modules: check(m) as Module[],
      lessons: check(l) as Lesson[],
      folders: check(f) as { course_id: string; drive_folder_url: string }[],
    };
  });
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <>
      <div className="section-heading">
        <h2>Học viên & quyền truy cập</h2>
        <button className="button secondary small" onClick={refresh}>
          Cập nhật
        </button>
      </div>
      <Notice>
        Thu hồi sẽ khóa website ngay. Sau đó bạn cần xóa quyền trên Drive và xác nhận hoàn tất.
        Email đã chia sẻ được giữ lại để đối chiếu kể cả khi học viên đổi email.
      </Notice>
      {data?.profiles.map((p) => (
        <article className="panel student-panel" key={p.id}>
          <h3>
            {p.full_name || p.email} {p.is_admin && <span className="badge">Admin</span>}
          </h3>
          <p className="muted">{p.email}</p>
          {data.enrollments.filter((e) => e.user_id === p.id).length ? (
            data.enrollments
              .filter((e) => e.user_id === p.id)
              .map((e) => {
                const ls = data.lessons.filter((l) =>
                  data.modules.some((m) => m.id === l.module_id && m.course_id === e.course_id),
                );
                const n = data.progress.filter(
                  (pr) =>
                    pr.user_id === p.id && pr.completed && ls.some((l) => l.id === pr.lesson_id),
                ).length;
                const folder = data.folders.find(
                  (f) => f.course_id === e.course_id,
                )?.drive_folder_url;
                return (
                  <div className="enrollment-row" key={e.course_id}>
                    <div>
                      <strong>{data.courses.find((c) => c.id === e.course_id)?.title}</strong>
                      <small>
                        {n}/{ls.length} bài hoàn thành · Drive: {e.drive_email}
                      </small>
                      <span
                        className={`badge ${e.active ? 'fulfilled' : e.drive_status === 'revoke_pending' ? 'reported' : 'cancelled'}`}
                      >
                        {e.active
                          ? 'Đang học'
                          : e.drive_status === 'revoke_pending'
                            ? 'Chờ thu hồi Drive'
                            : 'Đã thu hồi cả hai'}
                      </span>
                    </div>
                    <div className="inline">
                      {e.active ? (
                        <Action
                          className="button danger small"
                          onClick={async () => {
                            if (
                              window.confirm(
                                `Khóa quyền học của ${p.email}? Bạn vẫn phải thu hồi quyền trên Drive.`,
                              )
                            ) {
                              check(
                                await db().rpc('admin_access_action', {
                                  p_user: p.id,
                                  p_course: e.course_id,
                                  p_action: 'revoke',
                                }),
                              );
                              refresh();
                            }
                          }}
                        >
                          Thu hồi quyền học
                        </Action>
                      ) : (
                        e.drive_status === 'revoke_pending' && (
                          <>
                            {folder && (
                              <a
                                className="button secondary small"
                                href={safeUrl(folder)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Mở Drive <ExternalLink size={14} />
                              </a>
                            )}
                            <Action
                              className="button small"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Đã xóa mọi quyền xem folder/file của ${e.drive_email} trên Google Drive?`,
                                  )
                                ) {
                                  check(
                                    await db().rpc('admin_access_action', {
                                      p_user: p.id,
                                      p_course: e.course_id,
                                      p_action: 'confirm_drive_revoked',
                                    }),
                                  );
                                  refresh();
                                }
                              }}
                            >
                              Đã thu hồi Drive
                            </Action>
                          </>
                        )
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <p>Chưa được cấp khóa học nào.</p>
          )}
        </article>
      ))}
    </>
  );
}
function BankQrUpload({ value }: { value: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const image = preview || (!removed && safeUrl(value));
  return (
    <div className="field wide">
      <label htmlFor="bank-qr-file">Ảnh QR chuyển khoản (không bắt buộc)</label>
      <input type="hidden" name="bank_qr_url" value={removed ? '' : value} />
      <input
        ref={input}
        id="bank-qr-file"
        name="bank_qr_file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          setError('');
          if (!selected) return;
          if (
            selected.size > 5242880 ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)
          ) {
            event.target.value = '';
            setFile(null);
            setError('Chỉ nhận JPG, PNG hoặc WebP tối đa 5 MB.');
            return;
          }
          setFile(selected);
          setRemoved(false);
        }}
      />
      <small>JPG, PNG, WebP · Tối đa 5 MB. Chọn ảnh rồi bấm Lưu thay đổi.</small>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {image && (
        <>
          <img className="bank-qr" src={image} alt="Xem trước QR chuyển khoản" />
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              setFile(null);
              setRemoved(true);
              setError('');
              if (input.current) input.current.value = '';
            }}
          >
            Bỏ ảnh QR
          </button>
        </>
      )}
      <small>QR tĩnh chỉ để chọn tài khoản. Học viên cần nhập đúng số tiền và mã của đơn.</small>
    </div>
  );
}
function BankSettings() {
  const [savedQr, setSavedQr] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(0);
  const { data, loading, error } = useLoad(
    async () => check(await db().from('settings').select('*').eq('id', 1).single()) as Settings,
  );
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <div className="panel narrow">
      <h2>Thông tin nhận chuyển khoản</h2>
      <p className="muted">
        Học viên nhìn thấy thông tin này tại đơn hàng. Mỗi đơn có mã chuyển khoản riêng do hệ thống
        tạo.
      </p>
      <EditorForm
        onSave={async (f) => {
          let qr = text(f, 'bank_qr_url');
          const image = f.get('bank_qr_file');
          if (image instanceof File && image.size > 0) {
            if (
              image.size > 5242880 ||
              !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)
            )
              throw new Error('Chỉ nhận JPG, PNG hoặc WebP tối đa 5 MB.');
            const path = `payment-qr/${crypto.randomUUID()}.${image.type.split('/')[1]}`;
            const storage = db().storage.from('course-thumbnails');
            check(await storage.upload(path, image, { contentType: image.type }));
            qr = storage.getPublicUrl(path).data.publicUrl;
          }
          if (qr && !safeUrl(qr)) throw new Error('Ảnh QR cần URL HTTPS.');
          check(
            await db()
              .from('settings')
              .update({
                bank_name: text(f, 'bank_name'),
                bank_account: text(f, 'bank_account'),
                bank_owner: text(f, 'bank_owner'),
                bank_qr_url: qr,
              })
              .eq('id', 1),
          );
          setSavedQr(qr);
          setQrVersion((version) => version + 1);
        }}
      >
        <Field label="Ngân hàng" name="bank_name" value={data?.bank_name} required />
        <Field label="Số tài khoản" name="bank_account" value={data?.bank_account} required />
        <Field label="Chủ tài khoản" name="bank_owner" value={data?.bank_owner} required />
        <BankQrUpload key={qrVersion} value={savedQr ?? data?.bank_qr_url ?? ''} />
      </EditorForm>
    </div>
  );
}
function AuditPage() {
  const { data, error, loading } = useLoad(async () => {
    const [a, p] = await Promise.all([
      db().from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
      db().from('profiles').select('*'),
    ]);
    return { logs: check(a) as Audit[], profiles: check(p) as Profile[] };
  });
  const labels: Record<string, string> = {
    confirm_payment: 'Xác nhận thanh toán',
    grant_access: 'Xác nhận chia sẻ Drive và cấp quyền',
    cancel: 'Hủy đơn',
    revoke: 'Khóa quyền học',
    confirm_drive_revoked: 'Xác nhận thu hồi Drive',
  };
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <>
      <h2>200 thao tác quyền học và thanh toán gần nhất</h2>
      {data?.logs.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Thao tác</th>
                <th>Mã tham chiếu</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString('vi-VN')}</td>
                  <td>{data.profiles.find((p) => p.id === a.actor_id)?.email}</td>
                  <td>{labels[a.action] || a.action}</td>
                  <td>
                    <code>{a.target_id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Chưa có thao tác quản trị" />
      )}
    </>
  );
}

import { RichEditor } from '../RichEditor';
import { CourseImportPanel } from '../CourseImportPanel';
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
  ChevronLeft,
  Pencil,
  Save,
  Trash2,
  ShieldCheck,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Action, Empty, Loading, Notice, useLoad } from '../components';
import { AdminPages, AdminReports } from '../Support';
import { AdminRoles } from './AdminRoles';
import { AdminDirectory } from './AdminDirectory';
import { useAuth } from '../auth';
import { check, db, driveId, errorText, money, safeUrl, validDrive } from '../lib';
import type {
  Audit,
  Course,
  Lesson,
  LessonContent,
  Module,
  Profile,
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
        <NavLink to="/admin/administrators">
          <ShieldCheck size={17} />
          Quản trị viên
        </NavLink>
        <NavLink to="/admin/settings">
          <SettingsIcon size={17} />
          Thanh toán
        </NavLink>
        <NavLink to="/admin/pages">
          <BookOpen size={17} />
          Trang thông tin
        </NavLink>
        <NavLink to="/admin/reports">
          <History size={17} />
          Báo lỗi
        </NavLink>
        <NavLink to="/admin/audit">
          <History size={17} />
          Nhật ký
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<AdminCourses />} />
        <Route path="courses/:id" element={<CourseEditor />} />
        <Route path="orders" element={<AdminDirectory key="orders" kind="orders" />} />
        <Route path="students" element={<AdminDirectory key="students" kind="students" />} />
        <Route path="administrators" element={<AdminRoles />} />
        <Route path="settings" element={<BankSettings />} />
        <Route path="pages" element={<AdminPages />} />
        <Route path="reports" element={<AdminReports />} />
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
  if (multiline)
    return (
      <div className="field wide">
        <span>{label}</span>
        <RichEditor name={name} value={String(value)} compact={name === 'summary'} label={label} />
      </div>
    );
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
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      await onSave(data);
      form.dispatchEvent(new Event('editor-saved'));
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
                      {c.published
                        ? c.under_construction
                          ? 'Đang được xây dựng'
                          : 'Đã xuất bản'
                        : 'Bản nháp'}
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
                          if (!c.published && !safeUrl(c.thumbnail_url))
                            throw new Error(
                              'Vui lòng thêm ảnh đại diện HTTPS trong phần Sửa trước khi xuất bản.',
                            );
                          check(
                            await db()
                              .from('courses')
                              .update({
                                published: c.under_construction || !c.published,
                                under_construction: false,
                              })
                              .eq('id', c.id),
                          );
                          refresh();
                        }}
                      >
                        {c.published && !c.under_construction ? 'Ẩn khóa học' : 'Xuất bản'}
                      </Action>
                      <Action
                        className="button secondary small"
                        disabled={c.published && c.under_construction}
                        onClick={async () => {
                          if (!safeUrl(c.thumbnail_url))
                            throw new Error(
                              'Vui lòng thêm ảnh đại diện trước khi hiển thị khóa học đang xây dựng.',
                            );
                          check(
                            await db()
                              .from('courses')
                              .update({ published: true, under_construction: true })
                              .eq('id', c.id),
                          );
                          refresh();
                        }}
                      >
                        Đang xây dựng
                      </Action>
                      <Action
                        className="button danger small"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Xóa vĩnh viễn khóa học “${c.title}” cùng tất cả chương, bài học, nội dung và liên kết tài liệu? Thao tác này không thể hoàn tác. File trên Google Drive không bị xóa. Khóa học có đơn hàng hoặc quyền học sẽ không thể xóa.`,
                            )
                          )
                            return;
                          const result = await db()
                            .from('courses')
                            .delete()
                            .eq('id', c.id)
                            .select('id');
                          if (result.error?.code === '23503') {
                            throw new Error(
                              'Không thể xóa khóa học đã có đơn hàng hoặc quyền học, kể cả lịch sử đã hủy/thu hồi.',
                            );
                          }
                          const deleted = check(result);
                          if (!deleted?.length)
                            throw new Error(
                              'Khóa học không còn tồn tại hoặc bạn không có quyền xóa. Hãy cập nhật lại trang.',
                            );
                          refresh();
                        }}
                      >
                        <Trash2 size={15} />
                        Xóa khóa học
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
function courseSlug(title: string) {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'khoa-hoc'
  );
}
function CourseBasics({ course, instructor }: { course?: Course | null; instructor: string }) {
  const [title, setTitle] = useState(course?.title || '');
  const [slug, setSlug] = useState(course?.slug || '');
  const [price, setPrice] = useState(String(course?.price ?? 0));
  return (
    <>
      <Field name="title" label="Tên khóa học">
        <input
          name="title"
          value={title}
          required
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(e.target.value.trim() ? courseSlug(e.target.value) : '');
          }}
        />
      </Field>
      <Field
        name="slug"
        label="Đường dẫn tự động"
        hint="Tự tạo từ tên khóa học; thêm hậu tố nếu đường dẫn đã tồn tại."
      >
        <input name="slug" value={slug} readOnly />
      </Field>
      <Field name="category" label="Danh mục" value={course?.category || 'Khóa học'} required />
      <Field name="level" label="Trình độ">
        <select
          name="level"
          defaultValue={
            ['Cơ bản', 'Khá', 'Nâng cao'].includes(course?.level || '') ? course!.level : 'Cơ bản'
          }
        >
          <option>Cơ bản</option>
          <option>Khá</option>
          <option>Nâng cao</option>
        </select>
      </Field>
      <Field name="instructor" label="Giảng viên" hint="Tên tài khoản admin đang đăng nhập.">
        <input name="instructor" value={instructor} readOnly />
      </Field>
      <Field name="price_display" label="Giá (VNĐ)">
        <span className="course-price-input">
          <input
            name="price_display"
            inputMode="numeric"
            autoComplete="off"
            required
            value={price === '' ? '' : Number(price).toLocaleString('vi-VN')}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
          />
          <span>VNĐ</span>
        </span>
      </Field>
      <input type="hidden" name="price" value={price} />
    </>
  );
}
function CourseEditor() {
  const { profile, user } = useAuth();
  const instructor =
    profile?.full_name?.trim() ||
    String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim() ||
    profile?.email ||
    '';
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
      <CourseImportPanel
        courseId={isNew ? undefined : id}
        onImported={(courseId) => {
          if (courseId === id) refresh();
          else navigate(`/admin/courses/${courseId}`);
        }}
      />
      <section className="panel content-section">
        <h2>{isNew ? 'Tạo khóa học' : c?.title}</h2>
        <EditorForm
          key={id}
          onSave={async (f) => {
            const thumb = text(f, 'thumbnail_url');
            if (thumb && !safeUrl(thumb)) throw new Error('Ảnh cần sử dụng URL HTTPS.');
            if (f.get('status') !== 'draft' && !safeUrl(thumb))
              throw new Error('Vui lòng thêm ảnh đại diện trước khi xuất bản khóa học.');
            if (!text(f, 'title')) throw new Error('Vui lòng nhập tên khóa học.');
            if (!instructor)
              throw new Error('Chưa tải được tên tài khoản. Vui lòng tải lại trang.');
            let slug = text(f, 'slug') || courseSlug(text(f, 'title'));
            const existing = check(await db().from('courses').select('id').eq('slug', slug));
            if (existing?.some((row: { id: string }) => row.id !== id))
              slug += `-${crypto.randomUUID().slice(0, 8)}`;
            const price = Number(f.get('price'));
            if (!Number.isSafeInteger(price) || price < 0 || price > 1000000000)
              throw new Error('Giá phải từ 0 đến 1.000.000.000 VNĐ.');
            const values = {
              title: text(f, 'title'),
              slug,
              summary: text(f, 'summary'),
              description: text(f, 'description'),
              instructor,
              category: text(f, 'category'),
              level: text(f, 'level'),
              price,
              thumbnail_url: thumb,
              published: f.get('status') !== 'draft',
              under_construction: f.get('status') === 'building',
            };
            if (isNew) {
              const row = check(await db().from('courses').insert(values).select().single());
              navigate(`/admin/courses/${row.id}`);
            } else check(await db().from('courses').update(values).eq('id', id!));
          }}
        >
          <div className="form-grid">
            <CourseBasics course={c} instructor={instructor} />
            <Field name="summary" label="Mô tả ngắn" value={c?.summary} multiline />
            <Field
              name="description"
              label="Giới thiệu chi tiết"
              value={c?.description}
              multiline
            />
            <Thumbnail value={c?.thumbnail_url || ''} />
          </div>
          <Field name="status" label="Trạng thái khóa học">
            <select
              name="status"
              defaultValue={
                !c?.published ? 'draft' : c.under_construction ? 'building' : 'published'
              }
            >
              <option value="draft">Bản nháp — không hiển thị công khai</option>
              <option value="building">Đang xây dựng — hiển thị, chưa cho mua</option>
              <option value="published">Xuất bản — mở đăng ký</option>
            </select>
          </Field>
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
  const [drag, setDrag] = useState<{ kind: 'module' | 'lesson'; id: string } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveNotice, setMoveNotice] = useState('');
  const moveLock = useRef(false);
  async function move(
    kind: 'module' | 'lesson',
    item: string,
    target: string | null,
    index: number,
  ) {
    if (moveLock.current) return;
    moveLock.current = true;
    setMoving(true);
    setMoveNotice('');
    setDrag(null);
    try {
      const response = await db().rpc('admin_move_curriculum', {
        p_course: courseId,
        p_kind: kind,
        p_item: item,
        p_target: target,
        p_index: index,
      });
      if (response.error?.code === 'PGRST202')
        throw new Error('Cần chạy 005_curriculum_order.sql trong Supabase trước khi sắp xếp.');
      check(response);
      setMoveNotice('Đã lưu thứ tự mới.');
      refresh();
    } catch (e) {
      setMoveNotice(errorText(e));
    } finally {
      moveLock.current = false;
      setMoving(false);
    }
  }
  function grip(kind: 'module' | 'lesson', id: string, title: string) {
    return (
      <button
        type="button"
        className="button secondary small drag-grip"
        draggable={!moving}
        aria-label={`Kéo ${title} để sắp xếp`}
        title="Kéo để sắp xếp"
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', id);
          setDrag({ kind, id });
        }}
        onDragEnd={() => setDrag(null)}
      >
        <GripVertical size={18} />
      </button>
    );
  }
  const { data, loading, error, refresh } = useLoad(async () => {
    const modules = check(
      await db()
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position')
        .order('id'),
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
            .order('position')
            .order('id'),
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
        Kéo tay nắm ⋮⋮ để sắp xếp. Thả bài lên một bài khác để chèn trước, hoặc xuống cuối chương để
        chuyển chương. Thay đổi được tự lưu.
      </p>
      {moveNotice && <Notice>{moveNotice}</Notice>}
      {moving && <p role="status">Đang lưu thứ tự…</p>}
      {data?.modules.map((m, mi) => (
        <div
          className={`panel module-editor ${drag?.kind === 'module' ? 'curriculum-drop-target' : ''}`}
          key={m.id}
          onDragOver={(e) => {
            if (drag?.kind === 'module') e.preventDefault();
          }}
          onDrop={(e) => {
            if (drag?.kind !== 'module') return;
            e.preventDefault();
            e.stopPropagation();
            if (drag.id === m.id) return;
            const remaining = data.modules.filter((x) => x.id !== drag.id);
            void move(
              'module',
              drag.id,
              null,
              remaining.findIndex((x) => x.id === m.id) +
                (e.clientY >
                e.currentTarget.getBoundingClientRect().top +
                  e.currentTarget.getBoundingClientRect().height / 2
                  ? 1
                  : 0),
            );
          }}
        >
          <div className="inline curriculum-sort-bar">
            {grip('module', m.id, m.title)}
            <strong>Chương {mi + 1}</strong>
            <button
              className="button secondary small"
              disabled={moving || mi === 0}
              aria-label={`Đưa chương ${m.title} lên`}
              onClick={() => void move('module', m.id, null, mi - 1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="button secondary small"
              disabled={moving || mi === data.modules.length - 1}
              aria-label={`Đưa chương ${m.title} xuống`}
              onClick={() => void move('module', m.id, null, mi + 1)}
            >
              <ArrowDown size={16} />
            </button>
          </div>
          <EditorForm
            label="Lưu chương"
            onSave={async (f) => {
              check(
                await db()
                  .from('modules')
                  .update({ title: text(f, 'title') })
                  .eq('id', m.id),
              );
              refresh();
            }}
          >
            <div className="form-grid">
              <Field label="Tên chương" name="title" value={m.title} required />
            </div>
          </EditorForm>
          <div className="module-lessons">
            {data.lessons
              .filter((l) => l.module_id === m.id)
              .map((l, li, siblings) => (
                <div
                  className={`module-lesson ${drag?.kind === 'lesson' ? 'curriculum-drop-target' : ''}`}
                  key={l.id}
                  onDragOver={(e) => {
                    if (drag?.kind === 'lesson') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDrop={(e) => {
                    if (drag?.kind !== 'lesson') return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (drag.id === l.id) return;
                    void move(
                      'lesson',
                      drag.id,
                      m.id,
                      siblings.filter((x) => x.id !== drag.id).findIndex((x) => x.id === l.id),
                    );
                  }}
                >
                  {grip('lesson', l.id, l.title)}
                  <span>
                    {li + 1}. {l.title}
                    <small>{l.duration_minutes} phút</small>
                  </span>
                  <div className="inline lesson-sort-actions">
                    <button
                      className="button secondary small"
                      disabled={moving || li === 0}
                      aria-label={`Đưa bài ${l.title} lên`}
                      onClick={() => void move('lesson', l.id, m.id, li - 1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="button secondary small"
                      disabled={moving || li === siblings.length - 1}
                      aria-label={`Đưa bài ${l.title} xuống`}
                      onClick={() => void move('lesson', l.id, m.id, li + 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <select
                      aria-label={`Chuyển bài ${l.title} sang chương`}
                      disabled={moving}
                      value={m.id}
                      onChange={(e) =>
                        void move(
                          'lesson',
                          l.id,
                          e.target.value,
                          data.lessons.filter((x) => x.module_id === e.target.value).length,
                        )
                      }
                    >
                      {data.modules.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>
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
          <div
            className={`curriculum-drop-end ${drag?.kind === 'lesson' ? 'is-dragging' : ''}`}
            onDragOver={(e) => {
              if (drag?.kind === 'lesson') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onDrop={(e) => {
              if (drag?.kind !== 'lesson') return;
              e.preventDefault();
              e.stopPropagation();
              void move(
                'lesson',
                drag.id,
                m.id,
                data.lessons.filter((x) => x.module_id === m.id && x.id !== drag.id).length,
              );
            }}
          >
            Thả bài vào cuối chương này
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
                    position: lesson?.position ?? position,
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
                label="Video Google Drive"
                name="video_url"
                type="url"
                value={data?.video_url}
              />
              <Field label="Nội dung bài học" name="body" value={data?.body} multiline />
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
    grant_admin: 'Cấp quyền quản trị viên',
    revoke_admin: 'Thu hồi quyền quản trị viên',
    reorder_module: 'Sắp xếp chương',
    reorder_lesson: 'Sắp xếp hoặc chuyển bài học',
  };
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  return (
    <>
      <h2>200 thao tác quản trị gần nhất</h2>
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

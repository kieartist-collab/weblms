import { InformationPage } from './InformationPage';
import { RichEditor } from './RichEditor';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Bug, MessageCircle, X, Send, ImagePlus, FileText } from 'lucide-react';
import { useAuth } from './auth';
import { Action, Loading, Notice, useLoad } from './components';
import { check, db, errorText } from './lib';

export const pageLinks = [
  ['huong-dan-mua-khoa-hoc', 'Hướng dẫn mua khóa học'],
  ['chinh-sach-bao-hanh', 'Chính sách bảo hành'],
  ['chinh-sach-hoan-tien', 'Chính sách hoàn tiền'],
  ['mentor-1vs1', 'Mentor 1vs1'],
];
type Page = { slug: string; title: string; body: string };
export function SupportLinks() {
  return (
    <>
      {pageLinks.map(([slug, title]) => (
        <Link key={slug} to={`/pages/${slug}`}>
          <FileText size={15} /> {title}
        </Link>
      ))}
    </>
  );
}
export function SupportWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const close = () => {
    if (!lock.current) {
      dialog.current?.close();
      trigger.current?.focus();
    }
  };
  const selectFile = (value?: File) => {
    if (!value) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type) || value.size > 5242880) {
      setError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
      return;
    }
    setError('');
    setFile(value);
  };
  return (
    <>
      <div className="support-floating" aria-label="Hỗ trợ">
        <button
          ref={trigger}
          title="Báo lỗi"
          aria-label="Báo lỗi"
          onClick={() => {
            setSent(false);
            setError('');
            dialog.current?.showModal();
          }}
        >
          <Bug size={22} />
        </button>
        <a
          href="https://m.me/kieartist"
          target="_blank"
          rel="noopener noreferrer"
          title="Nhắn tin cho Kistein Do"
          aria-label="Nhắn tin Messenger cho Kistein Do"
        >
          <MessageCircle size={23} />
        </a>
      </div>
      <dialog
        className="support-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="section-head">
          <h2>Báo cáo lỗi</h2>
          <button className="icon-button" aria-label="Đóng báo lỗi" disabled={busy} onClick={close}>
            <X />
          </button>
        </div>
        {!user ? (
          <>
            <p>Đăng nhập để gửi báo lỗi và ảnh minh họa cho quản trị viên.</p>
            <Link
              className="button"
              to={`/login?next=${encodeURIComponent(location.pathname)}`}
              onClick={close}
            >
              Đăng nhập Google
            </Link>
          </>
        ) : sent ? (
          <>
            <Notice>Đã gửi báo lỗi. Cảm ơn bạn đã giúp cải thiện khóa học.</Notice>
            <button className="button" onClick={close}>
              Đóng
            </button>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current) return;
              if (message.trim().length < 10) {
                setError('Vui lòng mô tả ít nhất 10 ký tự.');
                return;
              }
              lock.current = true;
              setBusy(true);
              setError('');
              let imagePath: string | null = null;
              try {
                if (file) {
                  const ext =
                    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
                  imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
                  check(
                    await db()
                      .storage.from('bug-reports')
                      .upload(imagePath, file, { contentType: file.type }),
                  );
                }
                check(
                  await db().from('bug_reports').insert({
                    message: message.trim(),
                    page_path: location.pathname,
                    image_path: imagePath,
                  }),
                );
                setSent(true);
                setMessage('');
                setFile(null);
              } catch (err) {
                setError(errorText(err));
                if (imagePath) await db().storage.from('bug-reports').remove([imagePath]);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Nội dung lỗi *</span>
              <textarea
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                value={message}
                disabled={busy}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mô tả lỗi bạn gặp hoặc điều bạn muốn cải thiện…"
              />
            </label>
            <label className="field">
              <span>Ảnh minh họa (không bắt buộc)</span>
              <div
                className="report-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) selectFile(e.dataTransfer.files[0]);
                }}
              >
                <ImagePlus />
                <span>Chọn hoặc kéo thả ảnh · tối đa 5 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => selectFile(e.target.files?.[0])}
                />
              </div>
            </label>
            {preview && (
              <div className="report-preview">
                <img src={preview} alt="Ảnh minh họa đã chọn" />
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  onClick={() => setFile(null)}
                >
                  Bỏ ảnh
                </button>
              </div>
            )}
            <p className="muted">
              Đường dẫn trang hiện tại được gửi kèm. Nội dung và ảnh chỉ dành cho bạn và quản trị
              viên.
            </p>
            {error && <Notice error>{error}</Notice>}
            <div className="support-actions">
              <button type="button" className="button secondary" disabled={busy} onClick={close}>
                Hủy
              </button>
              <button className="button" disabled={busy}>
                <Send size={17} />
                {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
export function PublicPage() {
  const { slug } = useParams();
  const { data, loading, error } = useLoad(
    async () =>
      check(
        await db().from('site_pages').select('*').eq('slug', slug!).maybeSingle(),
      ) as Page | null,
    [slug],
  );
  if (loading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="container page">
        <Notice error>{error}</Notice>
      </div>
    );
  if (!data)
    return (
      <div className="container page">
        <h1>Không tìm thấy trang</h1>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  return <InformationPage page={data} />;
}

export function AdminPages() {
  const { data, loading, error, refresh } = useLoad(
    async () => check(await db().from('site_pages').select('*').order('slug')) as Page[],
    [],
  );
  return (
    <>
      <h2>Trang thông tin</h2>
      <p>
        Nội dung hiển thị công khai sau khi lưu. Hãy rà soát các điều kiện hỗ trợ, hoàn tiền trước
        khi áp dụng.
      </p>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : (
        data?.map((page) => (
          <PageEditor key={page.slug + page.body + page.title} page={page} onSaved={refresh} />
        ))
      )}
    </>
  );
}
function PageEditor({ page, onSaved }: { page: Page; onSaved: () => void }) {
  const [title, setTitle] = useState(page.title),
    [body, setBody] = useState(page.body);
  return (
    <details className="panel support-editor">
      <summary>{page.title}</summary>
      <label className="field">
        <span>Tiêu đề</span>
        <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span>Nội dung</span>
        <RichEditor value={body} onChange={setBody} label={page.title} />
      </div>
      <div className="support-actions">
        <Link to={`/pages/${page.slug}`} target="_blank">
          Xem trang ↗
        </Link>
        <Action
          disabled={!title.trim()}
          onClick={async () => {
            check(
              await db()
                .from('site_pages')
                .update({ title: title.trim(), body, updated_at: new Date().toISOString() })
                .eq('slug', page.slug),
            );
            onSaved();
          }}
        >
          Lưu nội dung
        </Action>
      </div>
    </details>
  );
}
type Report = {
  id: string;
  user_id: string;
  message: string;
  page_path: string;
  image_path: string | null;
  status: string;
  created_at: string;
};
export function AdminReports() {
  const [page, setPage] = useState(0),
    [status, setStatus] = useState('new');
  const { data, loading, error, refresh } = useLoad(async () => {
    let query = db()
      .from('bug_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id')
      .range(page * 20, page * 20 + 19);
    if (status) query = query.eq('status', status);
    const result = await query;
    check(result);
    const reports = result.data as Report[];
    const users = reports.length
      ? (check(
          await db()
            .from('profiles')
            .select('id,email')
            .in('id', [...new Set(reports.map((r) => r.user_id))]),
        ) as { id: string; email: string }[])
      : [];
    return { reports, users, count: result.count ?? 0 };
  }, [page, status]);
  return (
    <>
      <h2>Báo lỗi từ học viên</h2>
      <label className="field">
        <span>Trạng thái</span>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="new">Chưa xử lý</option>
          <option value="resolved">Đã xử lý</option>
          <option value="">Tất cả</option>
        </select>
      </label>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : (
        <>
          {!data?.reports.length && <p>Chưa có báo lỗi trong danh sách này.</p>}
          {data?.reports.map((r) => (
            <div className="panel support-editor" key={r.id}>
              <strong>{data.users.find((u) => u.id === r.user_id)?.email || r.user_id}</strong>
              <p className="muted">
                {new Date(r.created_at).toLocaleString('vi-VN')} ·{' '}
                {r.status === 'new' ? 'Chưa xử lý' : 'Đã xử lý'}
              </p>
              <p className="prose">{r.message}</p>
              <Link
                to={
                  r.page_path.startsWith('/') &&
                  !r.page_path.startsWith('//') &&
                  !r.page_path.includes('\\')
                    ? r.page_path
                    : '/'
                }
              >
                Trang gặp lỗi ↗
              </Link>
              {r.image_path && <ReportImage path={r.image_path} />}
              <Action
                onClick={async () => {
                  check(
                    await db()
                      .from('bug_reports')
                      .update({ status: r.status === 'new' ? 'resolved' : 'new' })
                      .eq('id', r.id),
                  );
                  refresh();
                }}
              >
                {r.status === 'new' ? 'Đánh dấu đã xử lý' : 'Mở lại báo lỗi'}
              </Action>
            </div>
          ))}
          <div className="support-actions">
            <button
              className="button secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <span>
              Trang {page + 1} · {data?.count ?? 0} báo lỗi
            </span>
            <button
              className="button secondary"
              disabled={(page + 1) * 20 >= (data?.count ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </>
  );
}
function ReportImage({ path }: { path: string }) {
  const [url, setUrl] = useState('');
  return (
    <div className="report-preview">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="Ảnh học viên đính kèm" />
        </a>
      ) : (
        <Action
          className="button secondary"
          onClick={async () => {
            const result = await db().storage.from('bug-reports').createSignedUrl(path, 600);
            check(result);
            setUrl(result.data!.signedUrl);
          }}
        >
          Xem ảnh đính kèm
        </Action>
      )}
    </div>
  );
}

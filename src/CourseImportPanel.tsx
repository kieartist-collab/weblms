import { useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Action, Notice } from './components';
import { check, db, errorText, money } from './lib';
import { IMPORT_LIMIT, readCourseFile } from './course-import';
import type { CourseImport } from './course-import';

export function CourseImportPanel({
  courseId,
  onImported,
}: {
  courseId?: string;
  onImported: (id: string) => void;
}) {
  const [preview, setPreview] = useState<CourseImport | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('');
  async function parseFile(file: File) {
    setPreview(null);
    setError('');
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > IMPORT_LIMIT)
        throw new Error('Chọn file .xlsx, tối đa 5 MB.');
      setPreview(await readCourseFile(await file.arrayBuffer()));
      setSource(file.name);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel content-section">
      <h2>
        <FileSpreadsheet size={23} /> Nhập khóa học từ Excel
      </h2>
      <p className="muted">
        Nhập thông tin, chương, bài học và tài liệu vào khóa học nháp chưa có chương/đơn hàng. Ảnh
        đại diện nhập riêng trước khi xuất bản. Thứ tự dòng trong Excel là thứ tự chương và bài học.
      </p>
      <a className="button secondary small" href="/templates/khoa-hoc.xlsx" download>
        <Download size={16} /> Tải template Excel
      </a>
      <div className="form-grid" style={{ marginTop: 20 }}>
        <label>
          Chọn file từ máy
          <input
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void parseFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <div>
          <label htmlFor="course-drive-import">Link Excel / Google Sheets trên Drive</label>
          <input
            id="course-drive-import"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={link}
            disabled={busy}
            onChange={(e) => {
              setLink(e.target.value);
              setPreview(null);
            }}
          />
          <p className="muted">
            File phải được chia sẻ “Bất kỳ ai có đường liên kết” với quyền Người xem. Quyền video
            bài học vẫn do bạn quản lý riêng.
          </p>
          <Action
            className="button secondary small"
            disabled={busy || !link.trim()}
            onClick={async () => {
              setPreview(null);
              setError('');
              setBusy(true);
              try {
                const { data, error: failure } = await db().functions.invoke('course-import-file', {
                  body: { url: link.trim() },
                });
                if (failure) {
                  const response = 'context' in failure ? (failure.context as Response) : undefined;
                  const detail = response
                    ? await response
                        .clone()
                        .json()
                        .catch(() => null)
                    : null;
                  throw new Error(
                    detail?.error ||
                      'Chưa đọc được file Drive. Kiểm tra quyền chia sẻ hoặc tải file .xlsx về và chọn từ máy.',
                  );
                }
                if (!data?.base64 || data.base64.length > IMPORT_LIMIT * 1.4)
                  throw new Error('File Drive không hợp lệ hoặc quá lớn.');
                const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
                setPreview(await readCourseFile(bytes.buffer));
                setSource('Google Drive');
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Đọc từ Drive
          </Action>
        </div>
      </div>
      {busy && <p role="status">Đang đọc và kiểm tra dữ liệu…</p>}
      {error && <Notice error>{error}</Notice>}
      {preview && (
        <div style={{ marginTop: 24 }}>
          <h3>Xem trước: {preview.course.title}</h3>
          <p>
            {source} · {preview.course.category} · {preview.course.level} ·{' '}
            {money(preview.course.price)}
          </p>
          <p>
            {preview.modules.length} chương · {preview.lessons.length} bài ·{' '}
            {preview.resources.length} tài liệu
          </p>
          <details>
            <summary>Thông tin khóa học</summary>
            <p style={{ whiteSpace: 'pre-wrap' }}>{preview.course.summary}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{preview.course.description}</p>
          </details>
          <div style={{ maxHeight: 400, overflow: 'auto', margin: '16px 0' }}>
            {preview.modules.map((m) => (
              <details key={m.code}>
                <summary>
                  {m.title} ({preview.lessons.filter((l) => l.module === m.code).length} bài)
                </summary>
                {preview.lessons
                  .filter((l) => l.module === m.code)
                  .map((l) => (
                    <div key={l.code} style={{ padding: 12 }}>
                      <strong>{l.title}</strong> · {l.duration} phút
                      <p>{l.video || 'Chưa có video'}</p>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{l.body}</p>
                      {preview.resources
                        .filter((r) => r.lesson === l.code)
                        .map((r, i) => (
                          <p key={i}>
                            {r.title}: {r.url}
                          </p>
                        ))}
                    </div>
                  ))}
              </details>
            ))}
          </div>
          <Notice>
            Chỉ lưu khi bạn bấm nút bên dưới. Nội dung sẽ lưu dưới dạng văn bản; có thể định dạng
            lại bằng editor. Chỉ nhập vào khóa học chưa có chương, đơn hàng hoặc quyền học.
          </Notice>
          <Action
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const slug =
                  preview.course.title
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[đĐ]/g, 'd')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '') || 'khoa-hoc';
                const result = await db().rpc('admin_import_course', {
                  p_course: courseId || null,
                  p_slug: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
                  p_data: preview,
                });
                if (result.error?.code === 'PGRST202')
                  throw new Error(
                    'Cần chạy migration 008_course_import.sql trước khi nhập khóa học.',
                  );
                const id = check(result) as string;
                setPreview(null);
                onImported(id);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Upload size={17} /> Nhập dữ liệu và lưu nháp
          </Action>
        </div>
      )}
    </section>
  );
}

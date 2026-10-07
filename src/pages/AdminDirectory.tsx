import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Action, Empty, Loading, Notice, useLoad } from '../components';
import { check, db, money, orderLabels, safeUrl } from '../lib';
import type { Enrollment, Order, Profile } from '../types';

type OrderRow = Order & { email: string; course_title: string };
type StudentRow = Profile & { active_courses: number; pending_drive: number };
type StudentCourse = Enrollment & {
  course_title: string;
  drive_folder_url: string;
  total_lessons: number;
  completed_lessons: number;
};
type Result = { rows: (OrderRow & StudentRow)[]; total: number; page: number };
const dateTime = (s: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(s));
const dayString = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const response = await db().rpc(name, params);
  if (response.error?.code === 'PGRST202' || response.error?.code === '42883')
    throw new Error(
      'Cần chạy file 004_admin_directory.sql trong Supabase → SQL Editor để bật danh sách này.',
    );
  return check(response) as T;
}
export function AdminDirectory({ kind }: { kind: 'orders' | 'students' }) {
  const orders = kind === 'orders';
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '',
    status = params.get('status') || '',
    role = params.get('role') || '',
    course = params.get('course') || '';
  const from = params.get('from') || '',
    to = params.get('to') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const size = [25, 50, 100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 25;
  const [draft, setDraft] = useState(search);
  const [selected, setSelected] = useState<OrderRow | StudentRow | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setDraft(search);
  }, [search]);
  useEffect(() => {
    setSelected(null);
  }, [kind]);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const catalog = useLoad(async () => {
    const rows: { id: string; title: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const batch =
        check(
          await db()
            .from('courses')
            .select('id,title')
            .order('id')
            .range(offset, offset + 499),
        ) || [];
      rows.push(...batch);
      if (batch.length < 500) return rows;
    }
  });
  const invalidDates = !!(from && to && from > to);
  const { data, error, loading, refresh } = useLoad(async () => {
    if (invalidDates) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    return rpc<Result>('admin_directory', {
      p_kind: kind,
      p_search: search,
      p_status: status,
      p_role: role,
      p_course: course || null,
      p_from: orders && from ? from : null,
      p_to: orders && to ? to : null,
      p_page: page,
      p_size: size,
    });
  }, [kind, search, status, role, course, from, to, page, size, revision]);
  const quickDates = (days: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - (days - 1) * 86400000);
    update({ from: dayString(start), to: dayString(now) });
  };
  const current = data?.page || page,
    totalPages = Math.max(1, Math.ceil((data?.total || 0) / size));
  return (
    <>
      <div className="section-heading">
        <h2>{orders ? 'Đơn hàng & cấp quyền' : 'Học viên & quyền truy cập'}</h2>
        <button className="button secondary small" onClick={refresh}>
          Cập nhật
        </button>
      </div>
      <Notice>
        {orders
          ? 'Đối soát ngân hàng trước khi xác nhận tiền. Chỉ cấp quyền sau khi đã chia sẻ Drive cho đúng email.'
          : 'Thu hồi sẽ khóa website ngay. Bạn cần xóa quyền trên Drive rồi xác nhận hoàn tất trong chi tiết học viên.'}
      </Notice>
      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <label className="admin-search">
          <span>{orders ? 'Email hoặc mã chuyển khoản' : 'Tên hoặc email'}</span>
          <div className="inline">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nhập từ khóa…"
            />
            <button className="button secondary small" type="submit">
              <Search size={16} />
              Tìm
            </button>
          </div>
        </label>
        <label>
          <span>Khóa học</span>
          <select value={course} onChange={(e) => update({ course: e.target.value })}>
            <option value="">Tất cả khóa học</option>
            {catalog.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{orders ? 'Trạng thái đơn' : 'Quyền học'}</span>
          <select value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Tất cả</option>
            {orders ? (
              Object.entries(orderLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))
            ) : (
              <>
                <option value="active">Đang có quyền học</option>
                <option value="revoke_pending">Chờ thu hồi Drive</option>
                <option value="revoked">Đã thu hồi cả hai</option>
                <option value="none">Chưa có khóa học</option>
              </>
            )}
          </select>
        </label>
        {orders ? (
          <>
            <label>
              <span>Từ ngày (giờ Việt Nam)</span>
              <input type="date" value={from} onChange={(e) => update({ from: e.target.value })} />
            </label>
            <label>
              <span>Đến hết ngày</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => update({ to: e.target.value })}
              />
            </label>
          </>
        ) : (
          <label>
            <span>Vai trò</span>
            <select value={role} onChange={(e) => update({ role: e.target.value })}>
              <option value="">Tất cả</option>
              <option value="student">Học viên</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}
        <div className="inline filter-shortcuts">
          {orders && (
            <>
              <button
                type="button"
                className="button secondary small"
                onClick={() => quickDates(1)}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => quickDates(7)}
              >
                7 ngày
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => quickDates(30)}
              >
                30 ngày
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => update({ status: 'reported' })}
              >
                Chờ kiểm tra
              </button>
            </>
          )}
          {!orders && (
            <button
              type="button"
              className="button secondary small"
              onClick={() => update({ status: 'revoke_pending' })}
            >
              Chờ thu hồi Drive
            </button>
          )}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setDraft('');
              setParams({});
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </form>
      {catalog.error && <Notice error>Không tải được bộ lọc khóa học: {catalog.error}</Notice>}
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : !data?.rows.length ? (
        <Empty title="Không có kết quả phù hợp" />
      ) : (
        <div className="table-wrap admin-directory-table">
          <table>
            <thead>
              <tr>
                {(orders
                  ? ['Ngày giờ đặt (VN)', 'Email', 'Khóa học', 'Số tiền', 'Trạng thái', 'Thao tác']
                  : ['Họ tên', 'Email', 'Vai trò', 'Khóa đang học', 'Chờ thu hồi Drive', 'Thao tác']
                ).map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  {orders ? (
                    <>
                      <td>
                        <time dateTime={row.created_at}>{dateTime(row.created_at)}</time>
                      </td>
                      <td>{row.email}</td>
                      <td>{row.course_title}</td>
                      <td>{money(row.amount)}</td>
                      <td>
                        <span className={`badge ${row.status}`}>{orderLabels[row.status]}</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <strong>{row.full_name || 'Chưa có tên'}</strong>
                      </td>
                      <td>{row.email}</td>
                      <td>
                        <span className="badge">{row.is_admin ? 'Admin' : 'Học viên'}</span>
                      </td>
                      <td>{row.active_courses}</td>
                      <td>{row.pending_drive || '—'}</td>
                    </>
                  )}
                  <td>
                    <button
                      className="button secondary small"
                      onClick={() => setSelected(row)}
                      aria-label={`Chi tiết ${orders ? row.transfer_code : row.email}`}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="admin-pagination" aria-label="Phân trang">
        <span aria-live="polite">
          {data
            ? `${data.total ? (current - 1) * size + 1 : 0}–${Math.min(current * size, data.total)} / ${data.total} ${orders ? 'đơn hàng' : 'tài khoản'}`
            : '—'}
        </span>
        <label>
          Số dòng{' '}
          <select value={size} onChange={(e) => update({ size: e.target.value })}>
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
        </label>
        <div className="inline">
          <button
            className="button secondary small"
            disabled={loading || !data || current <= 1}
            onClick={() => update({ page: String(current - 1) })}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Trang {current} / {totalPages}
          </span>
          <button
            className="button secondary small"
            disabled={loading || !data || current >= totalPages}
            onClick={() => update({ page: String(current + 1) })}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </nav>
      {selected && (
        <DetailDrawer
          title={orders ? 'Chi tiết đơn hàng' : 'Chi tiết học viên'}
          close={() => setSelected(null)}
        >
          {orders ? (
            <OrderDetail id={selected.id} changed={() => setRevision((v) => v + 1)} />
          ) : (
            <StudentDetail
              student={selected as StudentRow}
              changed={() => setRevision((v) => v + 1)}
            />
          )}
        </DetailDrawer>
      )}
    </>
  );
}
function DetailDrawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin-detail-drawer"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="admin-detail-title"
    >
      <header>
        <h2 id="admin-detail-title">{title}</h2>
        <button className="button secondary small" onClick={close} aria-label="Đóng chi tiết">
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function OrderDetail({ id, changed }: { id: string; changed: () => void }) {
  const { data, loading, error, refresh } = useLoad(async () => {
    const o = check(await db().from('orders').select('*').eq('id', id).single()) as Order;
    const [p, c, f] = await Promise.all([
      db().from('profiles').select('email').eq('id', o.user_id).single(),
      db().from('courses').select('title').eq('id', o.course_id).single(),
      db()
        .from('course_private')
        .select('drive_folder_url')
        .eq('course_id', o.course_id)
        .maybeSingle(),
    ]);
    return {
      ...o,
      email: check(p)!.email,
      course_title: check(c)!.title,
      folder: check(f)?.drive_folder_url || '',
    };
  }, [id]);
  if (loading) return <Loading />;
  if (error || !data) return <Notice error>{error || 'Không tìm thấy đơn hàng'}</Notice>;
  const run = async (action: string, question: string) => {
    if (!window.confirm(question)) return;
    check(await db().rpc('admin_order_action', { p_order: id, p_action: action }));
    refresh();
    changed();
  };
  return (
    <>
      <h3>{data.course_title}</h3>
      <p>{data.email}</p>
      <p>
        Ngày giờ đặt: <strong>{dateTime(data.created_at)}</strong> (VN)
      </p>
      <p>
        {money(data.amount)} ·{' '}
        <span className={`badge ${data.status}`}>{orderLabels[data.status]}</span>
      </p>
      <p>Mã chuyển khoản</p>
      <code className="transfer-code">{data.transfer_code}</code>
      <div className="inline">
        {['pending', 'reported'].includes(data.status) && (
          <>
            <Action
              onClick={() =>
                run(
                  'confirm_payment',
                  `Đã nhận ${money(data.amount)} với mã ${data.transfer_code} của ${data.email}?`,
                )
              }
            >
              Xác nhận đã nhận tiền
            </Action>
            <Action
              className="button secondary"
              onClick={() => run('cancel', 'Hủy đơn chưa xác nhận thanh toán này?')}
            >
              Hủy đơn
            </Action>
          </>
        )}
        {data.status === 'paid' && (
          <>
            {safeUrl(data.folder) && (
              <a
                className="button secondary"
                href={safeUrl(data.folder)}
                target="_blank"
                rel="noreferrer"
              >
                Mở folder Drive <ExternalLink size={16} />
              </a>
            )}
            <Action
              onClick={() =>
                run(
                  'grant_access',
                  `Bạn đã chia sẻ đúng folder cho ${data.email} với quyền Viewer? Xác nhận để mở quyền học.`,
                )
              }
            >
              Đã chia sẻ Drive · Cấp quyền học
            </Action>
          </>
        )}
        {data.status === 'fulfilled' && (
          <Notice>Đơn đã được cấp quyền học. Quản lý thu hồi tại mục Học viên.</Notice>
        )}
        {data.status === 'cancelled' && <Notice>Đơn đã hủy.</Notice>}
      </div>
    </>
  );
}
function StudentDetail({ student, changed }: { student: StudentRow; changed: () => void }) {
  const { data, loading, error, refresh } = useLoad(
    () => rpc<StudentCourse[]>('admin_student_detail', { p_user: student.id }),
    [student.id],
  );
  const run = async (course: string, action: string, question: string) => {
    if (!window.confirm(question)) return;
    check(
      await db().rpc('admin_access_action', {
        p_user: student.id,
        p_course: course,
        p_action: action,
      }),
    );
    refresh();
    changed();
  };
  return (
    <>
      <h3>{student.full_name || student.email}</h3>
      <p>{student.email}</p>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : !data?.length ? (
        <Empty title="Chưa được cấp khóa học nào" />
      ) : (
        data.map((e) => (
          <article className="panel student-detail-course" key={e.course_id}>
            <h3>{e.course_title}</h3>
            <p>
              <span
                className={`badge ${e.active ? 'fulfilled' : e.drive_status === 'revoke_pending' ? 'reported' : 'cancelled'}`}
              >
                {e.active
                  ? 'Đang học'
                  : e.drive_status === 'revoke_pending'
                    ? 'Chờ thu hồi Drive'
                    : 'Đã thu hồi cả hai'}
              </span>
            </p>
            <p>
              {e.completed_lessons}/{e.total_lessons} bài hoàn thành
            </p>
            <progress
              value={e.completed_lessons}
              max={e.total_lessons || 1}
              aria-label={`Tiến độ ${e.course_title}`}
            />
            <p>Ngày cấp quyền: {dateTime(e.granted_at)}</p>
            <p>
              Email đã chia sẻ Drive: <strong>{e.drive_email}</strong>
            </p>
            {e.active ? (
              <Action
                className="button danger small"
                onClick={() =>
                  run(
                    e.course_id,
                    'revoke',
                    `Khóa quyền học của ${student.email}? Bạn vẫn phải thu hồi quyền trên Drive.`,
                  )
                }
              >
                Thu hồi quyền học
              </Action>
            ) : (
              e.drive_status === 'revoke_pending' && (
                <div className="inline">
                  {safeUrl(e.drive_folder_url) && (
                    <a
                      className="button secondary small"
                      href={safeUrl(e.drive_folder_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở Drive <ExternalLink size={14} />
                    </a>
                  )}
                  <Action
                    className="button small"
                    onClick={() =>
                      run(
                        e.course_id,
                        'confirm_drive_revoked',
                        `Đã xóa mọi quyền xem folder/file của ${e.drive_email} trên Google Drive?`,
                      )
                    }
                  >
                    Đã thu hồi Drive
                  </Action>
                </div>
              )
            )}
          </article>
        ))
      )}
    </>
  );
}

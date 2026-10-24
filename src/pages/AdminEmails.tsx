import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Action, Empty, useLoad, Loading, Notice } from '../components';
import { check, db, orderLabels } from '../lib';

type Email = { id: string; recipient: string; audience: string; event: keyof typeof orderLabels; status: string; attempts: number; created_at: string; last_error: string | null };
const statuses: Record<string, string> = {pending:'Chờ gửi / thử lại',processing:'Đang gửi',sent:'Nhà cung cấp đã nhận',failed:'Lỗi cần kiểm tra',skipped:'Đã bỏ qua'};
const badges: Record<string, string> = {pending:'pending',processing:'reported',sent:'fulfilled',failed:'cancelled',skipped:'cancelled'};
// PostgREST/Postgres codes for a missing table or function: migration 012 has not been applied.
const missingMigration = (code?: string) => ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(code ?? '');
export function AdminEmails() {
  const [message, setMessage] = useState('');
  const { data, error, loading, refresh } = useLoad(async () => {
    const result = await db().from('order_emails').select('id,recipient,audience,event,status,attempts,created_at,last_error').order('created_at', {ascending:false}).limit(200);
    if (missingMigration(result.error?.code)) throw new Error('Chưa bật email đơn hàng: cần chạy migration 012_order_emails.sql theo hướng dẫn trong supabase/functions/order-emails/README.md.');
    return check(result) as Email[];
  });
  return <section>
    <div className="section-heading">
      <h2>Email đơn hàng</h2>
      <button type="button" className="button secondary small" disabled={loading} onClick={() => { setMessage(''); refresh(); }}><RefreshCw size={15} /> Làm mới</button>
    </div>
    <p className="muted">200 thông báo gần nhất. "Nhà cung cấp đã nhận" chưa đảm bảo email đã vào hộp thư đến.</p>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {loading && <Loading />}
    {data && !data.length && <Empty title="Chưa có thông báo. Email được tạo cho sự kiện mới sau khi bật tính năng." />}
    {data && data.length > 0 && <div className="table-wrap"><table><thead><tr><th>Thời điểm</th><th>Người nhận</th><th>Sự kiện</th><th>Trạng thái</th><th>Số lần thử</th><th>Chi tiết</th></tr></thead><tbody>{data.map(e => <tr key={e.id}>
      <td>{new Date(e.created_at).toLocaleString('vi-VN')}</td>
      <td>{e.recipient || '—'}<small>{e.audience === 'admin' ? 'Admin' : 'Khách hàng'}</small></td>
      <td>{orderLabels[e.event]}</td>
      <td><span className={`badge ${badges[e.status] ?? ''}`}>{statuses[e.status] ?? e.status}</span></td>
      <td>{e.attempts}</td>
      <td>{e.last_error && <small>{e.last_error}</small>}{e.status === 'failed' && <Action className="button secondary small" onClick={async () => {
        if (!window.confirm(`Gửi lại email "${orderLabels[e.event]}" tới ${e.recipient}?\n\nNên kiểm tra nhật ký Resend trước để tránh người nhận nhận trùng email.`)) return;
        setMessage('');
        check(await db().rpc('admin_retry_order_email', {p_id:e.id}));
        setMessage(`Đã đưa email tới ${e.recipient} vào hàng đợi gửi lại.`);
        refresh();
      }}>Thử lại</Action>}</td>
    </tr>)}</tbody></table></div>}
  </section>;
}

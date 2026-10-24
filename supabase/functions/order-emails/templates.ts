const labels: Record<string, string> = {
  pending: 'Đã tiếp nhận đơn hàng — đang chờ thanh toán',
  reported: 'Đã nhận yêu cầu kiểm tra thanh toán',
  paid: 'Thanh toán thành công',
  fulfilled: 'Khóa học đã được cấp quyền truy cập',
  cancelled: 'Đơn hàng đã hủy',
};
export function emailContent(job: {order_id: string; audience: string; event: string; payload: Record<string, unknown>}, site: string, brand: string) {
  const p = job.payload;
  const admin = job.audience === 'admin';
  const subject = admin ? (job.event === 'pending' ? 'Có đơn hàng mới' : 'Khách hàng báo đã thanh toán — cần kiểm tra') : labels[job.event];
  const amount = new Intl.NumberFormat('vi-VN').format(Number(p.amount)) + ' VNĐ';
  const lines = [subject, `Khóa học: ${p.course_title}`, `Mã chuyển khoản: ${p.transfer_code}`, `Số tiền: ${amount}`];
  if (admin) lines.push(`Khách hàng: ${p.customer_name} (${p.customer_email})`);
  if (!admin && job.event === 'pending') lines.push('Đơn hàng đang chờ thanh toán.', `Ngân hàng: ${p.bank_name}`, `Số tài khoản: ${p.bank_account}`, `Chủ tài khoản: ${p.bank_owner}`, `Nội dung chuyển khoản: ${p.transfer_code}`);
  if (!admin && job.event === 'reported') lines.push('Học viện sẽ kiểm tra giao dịch. Đây chưa phải xác nhận đã nhận tiền.');
  if (!admin && job.event === 'paid') lines.push('Học viện đã xác nhận nhận tiền. Bạn sẽ nhận thông báo khi quyền học sẵn sàng.');
  if (!admin && job.event === 'fulfilled') lines.push('Quyền học đã được cấp. Hãy đăng nhập bằng email đã đặt hàng để vào học.');
  const link = `${site.replace(/\/$/, '')}${admin ? '/admin/orders' : `/orders/${job.order_id}`}`;
  lines.push(`Xem ${admin ? 'quản lý đơn hàng' : 'đơn hàng và truy cập khóa học'}: ${link}`, brand);
  const escape = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  return { subject: `[${brand}] ${subject}`, text: lines.join('\n'), html: `<div style="font-family:Arial,sans-serif;line-height:1.7">${lines.map(line => `<p>${escape(line)}</p>`).join('')}<p><a href="${escape(link)}">${admin ? 'Quản lý đơn hàng' : 'Xem đơn hàng'}</a></p></div>` };
}

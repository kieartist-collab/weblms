# Email đơn hàng

## Bật trên Supabase production

1. Tạo dịch vụ Resend, xác thực tên miền gửi bằng DNS theo hướng dẫn của Resend. Chuẩn bị địa chỉ From thuộc tên miền đã xác thực.
2. Chạy `supabase/migrations/012_order_emails.sql` bằng Supabase SQL Editor. Không chạy lại migration cũ. Migration chỉ tạo email cho sự kiện phát sinh sau đó, không gửi lại toàn bộ đơn cũ.
3. Lưu các secrets trong Supabase Dashboard > Edge Functions > Secrets (không đặt trong biến VITE hoặc commit vào Git):
   - `RESEND_API_KEY`: API key có quyền gửi của Resend.
   - `ORDER_EMAIL_FROM`: ví dụ `Zuno <thongbao@example.com>`.
   - `SITE_URL`: URL HTTPS chính thức của website, không kèm đường dẫn con.
   - `ORDER_EMAIL_BRAND`: tên học viện (mặc định Zuno).
   - `ORDER_EMAIL_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự, dùng riêng cho worker.
   Supabase cung cấp sẵn SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY cho Edge Function.
4. Deploy: `supabase functions deploy order-emails --no-verify-jwt`. Worker tự kiểm tra secret riêng; không nhận JWT người dùng làm quyền chạy worker.
5. Bật Supabase Cron và pg_net trong Dashboard. Trong Vault, tạo hai secret: `order_email_worker_url` = `https://PROJECT_REF.supabase.co/functions/v1/order-emails` và `order_email_worker_secret` = cùng giá trị ORDER_EMAIL_SECRET. Chạy SQL sau một lần:

```sql
select cron.schedule('send-order-emails', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='order_email_worker_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-order-email-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='order_email_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
```

6. Deploy frontend bình thường. Mở `/admin/emails` để theo dõi; nếu báo thiếu bảng hãy kiểm tra migration.

## Kiểm tra thực tế sau cấu hình

- Đặt đơn bằng tài khoản khách: khách nhận hướng dẫn chuyển khoản, mỗi admin hiện tại nhận thông báo riêng. Mở lại đơn không tạo email trùng.
- Khách báo thanh toán: khách nhận xác nhận yêu cầu, các admin nhận yêu cầu kiểm tra.
- Admin xác nhận thanh toán / cấp quyền / hủy đơn: khách nhận email tương ứng. Email cấp quyền chỉ phát sinh khi trạng thái fulfilled.
- Cấp thêm quyền admin trước một đơn mới: admin mới có email. Thu hồi trước lúc worker gửi: thông báo chờ của người đó bị bỏ qua.
- Giả lập API lỗi: đơn vẫn lưu, hàng đợi tự thử lại; không lộ API key trong trình duyệt.
- Kiểm tra inbox và spam, và nhật ký Resend. `sent` nghĩa là API nhà cung cấp đã nhận, không xác nhận delivered. Chưa tích hợp webhook bounce/delivery.

## Vận hành

Worker chạy mỗi phút, nhận tối đa 5 email/lượt; tăng thông lượng cần điều chỉnh theo giới hạn nhà cung cấp. Email snapshot giữ dữ liệu đơn tại thời điểm sự kiện. Không gửi email cho admin được cấp quyền sau khi sự kiện đã xảy ra. Admin cũng là người mua nhận riêng cả hai loại thông báo.

Khóa chống trùng cố định theo từng email, claim có khóa database, lease 5 phút và token bảo vệ kết quả giữa các worker. Thử lại tối đa 8 lần, giãn cách tăng dần. Dừng tự thử sau 23 giờ từ lần thử đầu để không vượt cửa sổ chống trùng 24 giờ của Resend. Nút thử lại chỉ cho phép trong cửa sổ này và còn lượt; ngoài cửa sổ phải đối chiếu log Resend trước khi xử lý thủ công, tránh gửi trùng. Không tự tạo khóa mới cho email lỗi. Không xóa lịch sử email khi xóa đơn/khóa học.

Tài liệu: [Supabase gửi email](https://supabase.com/docs/guides/functions/examples/send-emails), [Cron và Vault](https://supabase.com/docs/guides/functions/schedule-functions), [Resend idempotency](https://resend.com/changelog/idempotency-keys).

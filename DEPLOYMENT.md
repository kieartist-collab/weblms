# Đưa website lên Netlify

Website public: https://kistein-do.netlify.app/
Netlify project: https://app.netlify.com/projects/kistein-do/overview
Repository: https://github.com/kieartist-collab/weblms

Lần triển khai đầu dùng Netlify Drop với bản build local. Chưa kết nối tự động GitHub → Netlify; push GitHub chưa tự cập nhật website. Chưa xác nhận Google OAuth trên tên miền online.

## Cập nhật quản trị viên

Chạy `supabase/migrations/003_admin_roles.sql` một lần trong Supabase SQL Editor của project hiện tại, không chạy lại 001/002 hoặc seed. Sau đó vào `/admin/administrators`. Người nhận phải đăng nhập Google trên website trước; tìm theo email, xác nhận cấp quyền. Admin mới có toàn quyền (kể cả quản lý các admin khác). Không cho tự gỡ quyền; mọi thay đổi được ghi vào Nhật ký. Người được cấp quyền tải lại trang để thấy menu admin. Thu hồi có hiệu lực ở database ngay dù giao diện phiên cũ chưa tải lại.

Build bằng `pnpm run build`. Chỉ upload thư mục `dist`, không upload toàn bộ mã nguồn hoặc `.env.local` khi triển khai thủ công.

`public/_redirects` được copy vào bản build để các đường dẫn React và `/auth/callback` hoạt động khi mở trực tiếp. `netlify.toml` dành cho triển khai từ repository, build command `pnpm run build`, publish directory `dist`.

Sau khi nhận địa chỉ HTTPS chính thức:

1. Trong Supabase → Authentication → URL Configuration, đặt Site URL thành địa chỉ HTTPS của website.
2. Thêm chính xác `https://kistein-do.netlify.app/auth/callback` vào Redirect URLs. Giữ các URL localhost nếu còn phát triển local.
3. Google OAuth vẫn dùng callback Supabase đã đăng ký. Không thay callback Google bằng URL Netlify. Nếu có cấu hình JavaScript origins, bổ sung origin HTTPS của website khi cần.
4. Kiểm tra đăng nhập Google trên website online và quay về đúng tên miền; kiểm tra trang khóa học, đơn hàng và quyền học bằng tài khoản thích hợp.

Giữ nguyên Supabase hiện có. Không chạy lại migrations khởi tạo hoặc seed khi chỉ cập nhật giao diện. Browser chỉ dùng publishable/anon key, không dùng service role key hay Google client secret.

Các lần cập nhật tiếp theo: build lại, upload `dist` vào đúng project Netlify đang sử dụng để giữ địa chỉ website. Gói Free có hạn mức sử dụng; theo dõi trong Netlify và không bật nâng cấp trả phí ngoài ý muốn.

## Bảng đơn hàng và học viên (004)

Chạy `supabase/migrations/004_admin_directory.sql` trong Supabase SQL Editor trước khi sử dụng giao diện mới. Migration chỉ thêm hàm đọc dành cho admin và chỉ mục; có thể chạy lại.

- Đơn hàng: tìm email/mã chuyển khoản, lọc khóa học/trạng thái và ngày đặt theo giờ Việt Nam. Khoảng ngày tính cả ngày kết thúc. Thứ tự mới nhất trước, ID phân định khi trùng thời gian.
- Học viên: tìm tên/email, lọc vai trò, khóa học và quyền học; mỗi tài khoản một dòng. Số khóa đang học là tổng quyền đang hoạt động của tài khoản.
- Mỗi trang 25/50/100 dòng. Database trả tổng số kết quả và chỉ dữ liệu trang hiện tại. Bộ lọc và trang lưu trên URL.
- Bấm Chi tiết để tải đơn hoặc các quyền học/tiến độ của đúng người đó. Escape hoặc nút đóng trở về bảng giữ nguyên bộ lọc.
- Các thao tác duyệt tiền, cấp/thu hồi quyền vẫn qua RPC cũ, có xác nhận. Không tự động chia sẻ/thu hồi Drive.

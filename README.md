# Học viện Online

Giao diện tối được định nghĩa trong `src/dark.css`. Nội dung giới thiệu tác giả, đánh giá minh họa và FAQ nằm trong `src/home-content.ts`. Các đánh giá và hồ sơ tác giả hiện được ghi rõ là mẫu; hãy thay bằng nội dung đã xác minh. Footer chưa có email/mạng xã hội thật, nên không tạo liên kết giả hoặc chính sách chưa được xác nhận.

Website LMS tiếng Việt: danh mục khóa học, đăng nhập Google, chuyển khoản và duyệt thủ công, quyền học, video Google Drive, tiến độ, quản trị nội dung và nhật ký cấp/thu hồi quyền.

**Hiện chạy local, không có dịch vụ nào được triển khai hoặc bật trả phí.** Frontend: React + TypeScript + Vite + Tailwind CSS. Backend: Supabase Auth/PostgreSQL/Storage. Không tự chia sẻ hoặc thu hồi quyền Google Drive.

## 1. Chạy ngay bản xem trước

Yêu cầu Node.js 22.12+ và pnpm. Với Node 24 LTS cũng chạy được.

```powershell
pnpm install
pnpm dev
```

Mở <http://127.0.0.1:5173>. Khi chưa có hai biến Supabase, website hiển thị catalog mẫu cùng thông báo **Bản xem trước**. Không tạo tài khoản giả, giao dịch giả, hoặc cho phép vượt qua đăng nhập. Các trang học viên/admin sẽ dẫn đến hướng dẫn cấu hình.

Nếu `pnpm` chưa nằm trong PATH của PowerShell nhưng đang dùng máy Codex hiện tại:

```powershell
& "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd" dev
```

Các ảnh mẫu đã nằm trong `public/images`; bản xem trước không cần tải ảnh từ Internet.

## 2. Kết nối Supabase Free

1. Tạo project trong tài khoản Supabase của bạn. Chọn Free; không cần bật dịch vụ trả phí.
2. Trong **SQL Editor**, chạy lần lượt toàn bộ nội dung:
   - `supabase/migrations/001_lms.sql`: bảng, RLS, hàm nghiệp vụ, trigger hồ sơ.
   - `supabase/migrations/002_storage.sql`: bucket ảnh và quyền upload.
3. Hai migration là migration **chạy một lần** trên project mới; không chạy lại migration đã thành công. Mỗi migration cần được ghi nhận trong quy trình quản lý schema của bạn. File 001 có transaction để rollback nếu có lỗi.
4. Tùy chọn chạy `supabase/seed.sql`. Dữ liệu mẫu được tạo ở trạng thái **nháp**, không có video thật hoặc tài khoản ngân hàng; không ghi đè nội dung đã sửa khi chạy seed lại.
5. Sao chép `.env.example` thành `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Lấy URL và publishable key/legacy anon key ở **Project Settings → API / API Keys**. Đây là các giá trị dành cho trình duyệt, được bảo vệ bởi RLS. **Không dùng secret key hoặc service_role key.** `.env.local` được bỏ qua bởi Git. Đừng đưa Google client secret vào biến `VITE_*`.

Khởi động lại Vite sau khi sửa biến môi trường. Khi đã cấu hình Supabase, lỗi kết nối/migration sẽ được hiển thị; website không âm thầm quay về dữ liệu mẫu.

## 3. Đăng nhập Google

1. Trong Google Cloud Console, tạo/chọn project, cấu hình OAuth consent screen và OAuth client loại **Web application**. Chỉ cần các scope đăng nhập cơ bản; website **không xin quyền Drive API**.
2. Thêm người dùng thử nghiệm nếu ứng dụng OAuth còn ở chế độ Testing.
3. Trong Supabase **Authentication → Sign In / Providers → Google**, bật Google và nhập Client ID/Client Secret. Giữ secret trong Supabase, không đưa vào mã frontend.
4. Sao chép callback URL Supabase cung cấp, thường là `https://YOUR_PROJECT.supabase.co/auth/v1/callback`, vào **Authorized redirect URIs** của Google OAuth client. Callback của Google là URL Supabase, không phải trang frontend.
5. Trong Supabase **Authentication → URL Configuration**:
   - Site URL: `http://127.0.0.1:5173`.
   - Redirect allowlist: `http://127.0.0.1:5173/auth/callback` và `http://localhost:5173/auth/callback`.
6. Mở website và đăng nhập Google. Website lưu trang đích trong sessionStorage để quay lại sau OAuth.

Tài liệu: [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Thiết lập admin đầu tiên

Đăng nhập Google một lần để trigger tạo hồ sơ. Sau đó, **chỉ trong SQL Editor của project**, thay email dưới đây bằng đúng email của bạn và chạy:

```sql
update public.profiles
set is_admin = true
where lower(email) = lower('YOUR_GOOGLE_EMAIL')
returning id, email, is_admin;
```

Phải có đúng hồ sơ dự kiến được trả về. Tải lại website; mục **Quản trị** xuất hiện. Người dùng thông thường không có quyền update bảng profiles và không thể tự nâng quyền qua API.

## 5. Tạo nội dung và nhận thanh toán

Trong **Quản trị**:

1. **Thanh toán**: nhập ngân hàng, số tài khoản và chủ tài khoản. Có thể chọn ảnh QR JPG/PNG/WebP tối đa 5 MB, xem trước rồi bấm **Lưu thay đổi**. Ảnh được lưu trong bucket hiện có `course-thumbnails`, thư mục `payment-qr/`; chỉ admin được upload, không cần chạy thêm SQL. Bỏ ảnh QR rồi lưu để ngừng hiển thị (không xóa file cũ trong Storage). Học viên vẫn cần nhập đúng số tiền/mã đơn. Không thể tạo đơn trước khi cấu hình đủ ngân hàng.
2. **Khóa học**: nhập tên, slug không dấu, mô tả, giảng viên, danh mục, giá và ảnh. Có thể upload JPG/PNG/WebP tối đa 5 MB vào bucket `course-thumbnails`.
3. Lưu khóa học, rồi thêm folder Drive, chương, bài, video và tài liệu. Nội dung bài hỗ trợ văn bản thuần nhiều dòng, không thực thi HTML.
4. Sắp xếp bằng trường **Thứ tự**, số nhỏ trước. Dùng các số khác nhau trong cùng một chương/khóa học.
5. Thêm video dạng `https://drive.google.com/file/d/FILE_ID/view` hoặc `/open?id=FILE_ID`. Tài liệu nhận link HTTPS của Drive/Docs. Folder của khóa học chỉ admin nhìn thấy.
6. Kiểm tra nội dung rồi **Xuất bản**. Ẩn khóa học đưa về nháp và chặn học viên truy cập nội dung cho tới khi xuất bản lại. Quyền Drive vẫn do bạn quản lý riêng.

Các trang chính:

| Đường dẫn                         | Chức năng                                 |
| --------------------------------- | ----------------------------------------- |
| `/`, `/courses`, `/courses/:slug` | Catalog và chương trình công khai         |
| `/login`, `/auth/callback`        | Google OAuth                              |
| `/my-learning`, `/orders/:id`     | Khóa đã mua, tiến độ, trạng thái đơn      |
| `/learn/:courseId/:lessonId?`     | Nội dung có phân quyền                    |
| `/admin`                          | Khóa học, chương/bài                      |
| `/admin/orders`                   | Duyệt tiền và cấp quyền                   |
| `/admin/students`                 | Tiến độ và thu hồi quyền                  |
| `/admin/settings`, `/admin/audit` | Ngân hàng và nhật ký quyền học/thanh toán |

### Quy trình cấp quyền

1. Học viên dùng Google login tạo đơn. Giá được đọc từ database và lưu tại thời điểm mua. Một học viên chỉ có một đơn mở cho mỗi khóa.
2. Học viên chuyển khoản với mã `HV…` và bấm **Tôi đã chuyển khoản**. Đơn chuyển sang chờ kiểm tra, chưa mở bài học.
3. Admin đối soát ngân hàng rồi **Xác nhận đã nhận tiền**. Đơn chuyển sang chờ chia sẻ Drive.
4. Mở folder của đúng khóa, đặt **General access: Restricted**, thêm đúng email học viên với quyền **Viewer**. Không đặt “Anyone with the link”. Kiểm tra file con không có cấu hình hạn chế khác làm chặn học viên.
5. Trở lại website, bấm **Đã chia sẻ Drive · Cấp quyền học**. Học viên thấy khóa trong Góc học tập.

### Quy trình thu hồi

1. Trong Học viên, bấm **Thu hồi quyền học**. RLS chặn các lần đọc/ghi nội dung mới ngay; trang học kiểm tra lại quyền khi focus và mỗi 30 giây.
2. Trên Drive, xóa quyền folder **và các quyền riêng lẻ/qua nhóm nếu đã cấp** cho email được lưu trong mục Drive. Kiểm tra không còn cách truy cập khác.
3. Bấm **Đã thu hồi Drive** trên website. Trước đó trạng thái luôn là “Chờ thu hồi Drive”.

Quyền Drive và website độc lập. Nội dung đã tải về, đã chụp màn hình hoặc iframe đang phát không thể bị website thu hồi. Google Drive không phải DRM. Nhúng video phụ thuộc tài khoản Google/cookie của trình duyệt; luôn có nút mở trực tiếp trên Drive. Website không thể xác minh tự động bạn đã chia sẻ đúng file hay chưa.

## 6. Database và giao diện API

- Public catalog: `courses`, `modules`, `lessons` chỉ chứa thông tin giới thiệu; RLS ẩn bản nháp với khách/học viên.
- Private: `lesson_contents`, `resources` chỉ admin hoặc học viên có enrollment hoạt động và khóa đã xuất bản được đọc. `course_private` chỉ admin.
- `profiles` chỉ đọc hồ sơ của mình hoặc admin; email đồng bộ từ Auth, vai trò không nhận từ metadata do người dùng tự gửi.
- `orders`, `enrollments`, `progress` chỉ đọc dữ liệu của mình hoặc admin; các lệnh nghiệp vụ chạy bằng RPC. Học viên không có quyền ghi trực tiếp.
- `audit_log` chỉ admin đọc, không sửa/xóa qua frontend. Ghi các chuyển trạng thái thanh toán/cấp quyền/thu hồi; không ghi nội dung bài học hoặc secret.

| RPC                   | Đầu vào                              | Hành vi                                                            |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `create_order`        | `p_course`                           | Giá server; trả về đơn đang mở hoặc tạo mới                        |
| `report_payment`      | `p_order`                            | Chỉ chủ đơn; pending → reported                                    |
| `admin_order_action`  | `p_order`, `p_action`                | `confirm_payment`, `grant_access`, `cancel`                        |
| `admin_access_action` | `p_user`, `p_course`, `p_action`     | `revoke`, `confirm_drive_revoked`                                  |
| `record_progress`     | `p_lesson`, `p_completed` (tùy chọn) | Lưu lần mở bài; giữ trạng thái hoàn thành nếu không truyền boolean |

Các hàm đặc quyền cố định search_path, kiểm tra người gọi, khóa giao dịch và giới hạn quyền execute. Thao tác lặp không tạo bản ghi trùng hoặc tái cấp quyền từ đơn cũ đã fulfilled. Đơn đã xác nhận tiền không thể hủy bằng nút hủy đơn; hoàn tiền/đối soát ngân hàng thực hiện ngoài hệ thống. Quyền học không có ngày hết hạn.

## 7. Kiểm thử

```powershell
pnpm typecheck
pnpm test
pnpm build
```

`tests/database.test.mjs` chạy migration thật với PostgreSQL WASM (PGlite), giả lập `auth.uid()` và vai trò anon/authenticated. Kiểm tra RLS, cô lập dữ liệu, giá server, lặp thao tác, cấp quyền theo hai bước, thu hồi và policy Storage. Đây là kiểm thử database; **không thay cho Google OAuth/Drive/Storage tích hợp trên project thật**. Không cần Docker.

Kiểm thử thủ công trước khi vận hành:

- Dùng hai tài khoản Google A/B cùng admin. A mua và được cấp; B không có quyền và không đọc được link bài qua API hay URL trực tiếp.
- Tạo/sửa chương, bài, tài liệu; thứ tự hiển thị đúng; upload thumbnail rồi tải lại trang vẫn giữ ảnh.
- Duyệt tiền chưa mở bài; xác nhận chia sẻ Drive mới mở bài. Thử double click tạo đơn/hoàn thành.
- A xem iframe và mở Drive trực tiếp. B mở cùng link Drive phải bị từ chối khi chưa được chia sẻ; thử cả trường hợp trình duyệt đăng nhập sai Google account.
- Hoàn thành bài, tải lại, đăng xuất/đăng nhập: tiến độ và bài tiếp tục giữ đúng.
- Thu hồi A: API bị chặn, website rời trang học sau khi kiểm tra quyền; trạng thái Drive vẫn chờ đến khi admin xác nhận xóa quyền thật.
- Kiểm tra trên Chrome/Edge và điện thoại; trường hợp chặn cookie bên thứ ba dùng nút mở Drive.

## 8. Vận hành và giới hạn

- Website local cần Internet để dùng Supabase/Google. Không có tự động thanh toán, email giao dịch, Drive API, quiz hoặc chứng chỉ.
- Học viên phải chọn đúng tài khoản Google. Nếu email Google thay đổi, admin cần đối chiếu email đã chia sẻ và sửa quyền Drive thủ công.
- Supabase Free có quota và có thể pause khi ít hoạt động. Theo dõi Dashboard, xuất backup database định kỳ và giữ migrations; không tự bật nâng cấp trả phí. [Pricing](https://supabase.com/pricing), [project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).
- Các trang quản trị hiện phù hợp giai đoạn đầu; query danh sách dùng giới hạn trả về mặc định của Supabase (thường 1.000 hàng). Cần phân trang trước khi dữ liệu vượt mức này. Nhật ký hiển thị 200 thao tác gần nhất.
- Không có database nào được cấu hình tự động bằng tài khoản của bạn. Trước khi triển khai public, hoàn tất kiểm thử tích hợp, thay nội dung mẫu và kiểm tra quyền Drive của từng khóa.

## 9. Nguồn ảnh mẫu

- Kiến trúc: [Unsplash, minimal architecture](https://unsplash.com/s/photos/minimal-architecture), ảnh `photo-1549791084-5f78368b208b`.
- Máy ảnh: [Musa Ortaç trên Unsplash](https://unsplash.com/photos/a-person-holding-a-camera-in-their-hand-5U-ytv_3cms).
- Bìa thiết kế: typography do dự án tạo bằng HTML/CSS, không phải ảnh khóa học thật.

Ảnh được dùng làm minh họa dữ liệu mẫu; thay bằng ảnh do bạn cung cấp khi xuất bản khóa học.

## 10. Font và chuyển động giao diện

Mục “Sản phẩm học viên” dùng danh sách công khai từ playlist YouTube trong `src/student-videos.json`. Chạy `node scripts/sync-student-videos.mjs` khi playlist thay đổi rồi build lại. Không cần API key; script phụ thuộc định dạng dữ liệu YouTube. Thumbnail tải trực tiếp từ YouTube, iframe chỉ tải khi bấm xem. Video bị hạn chế nhúng có nút mở trực tiếp trên YouTube.

Giao diện triển lãm điện ảnh gồm một phim nổi bật với ảnh bên trái, nội dung bên phải và lưới ảnh 16:9 không cắt hình: 5 cột trên desktop, 3 cột trên tablet và 2 cột trên điện thoại. Tiêu đề và thời lượng đặt dưới ảnh; bấm tác phẩm để mở popup video cùng mô tả đầy đủ. Ban đầu hiển thị phim nổi bật và 10 video, tự thêm từng nhóm 10 video khi đến gần cuối; ảnh dùng lazy loading và có nút Xem thêm dự phòng. Script đồng bộ cả tiêu đề, mô tả gốc, thời lượng, tên kênh và ảnh lớn. Dữ liệu là bản lưu lúc đồng bộ, không gọi YouTube để lấy metadata mỗi lần khách mở trang.

- `src/cinematic.css`: nền charcoal, tiêu đề hẹp, điểm nhấn cyan và bố cục trang chủ theo từng dải.
- Font đóng gói tại local qua Fontsource: Barlow Condensed cho tiêu đề, Be Vietnam Pro cho nội dung tiếng Việt, JetBrains Mono cho nhãn nhỏ.
- `src/MotionSurface.tsx`: các phần xuất hiện một lần khi cuộn; CSS điều khiển hiệu ứng mở đầu, hover và FAQ. Tự giảm chuyển động theo `prefers-reduced-motion` của thiết bị.
- `src/home-content.ts`: thay đánh giá minh họa, hồ sơ tác giả và câu hỏi thường gặp bằng nội dung chính thức.

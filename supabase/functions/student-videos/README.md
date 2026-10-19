# Tự cập nhật sản phẩm học viên

1. Chạy `supabase/migrations/013_student_video_cache.sql` trong SQL Editor của Supabase hiện tại.
2. Trong Google Cloud bật **YouTube Data API v3**, tạo API key và giới hạn key chỉ dùng YouTube Data API v3.
3. Đặt secret phía Supabase: `supabase secrets set YOUTUBE_API_KEY=...`. Không đưa key vào biến `VITE_*` hoặc frontend.
4. Triển khai endpoint công khai chỉ đọc: `supabase functions deploy student-videos --no-verify-jwt`.
5. Build và đưa bản frontend mới lên hosting như bình thường.

Playlist mặc định: https://www.youtube.com/playlist?list=PLfwK-27X-RuFFsTEliY6_Xd2m8uXePQA3.
Nếu cần nhiều playlist, đặt secret `YOUTUBE_STUDENT_PLAYLIST_IDS` gồm các ID phân cách bởi dấu phẩy. Mọi playlist phải công khai.

Web gọi endpoint khi mở trang, khi quay lại tab và mỗi 15 phút. Endpoint dùng cache chung trong database, chỉ đồng bộ khi cache quá 15 phút; không cần build/deploy lại khi playlist đổi. Khi không có lượt truy cập thì không gọi YouTube, lượt truy cập tiếp theo sẽ đồng bộ. Video sắp theo ngày đăng YouTube mới nhất trước; loại trùng, video riêng tư/đã xóa và video cấm nhúng. Thêm/xóa/sửa video công khai trong playlist được phản ánh ở lần đồng bộ tiếp theo.

Nếu YouTube lỗi/hết quota, giữ cache cũ và cho phép thử lại sau 5 phút. Khi chưa có cache hoặc endpoint chưa cấu hình, frontend giữ danh sách đi kèm bản build. Danh sách rỗng hoàn toàn không ghi đè cache để tránh mất toàn bộ nội dung vì playlist bị đổi quyền ngoài ý muốn.

Kiểm tra sau triển khai: mở `/functions/v1/student-videos` trên domain Supabase, xác nhận `videos` và `updatedAt`; thêm video vào playlist, đợi cache hết hạn rồi tải lại trang. Kiểm tra tiêu đề, ảnh, thời lượng và popup phát video. Không có API key trong Network của trình duyệt.

API chính thức: https://developers.google.com/youtube/v3/docs/playlistItems/list

## Trạng thái triển khai ngày 20/10/2026

- Supabase project `bbuchsgufyunqmxnhlaq`: bảng cache đã tạo, RLS bật và không cấp quyền trực tiếp cho anon/authenticated.
- Edge Function `student-videos` đã triển khai bằng Dashboard, tắt Verify JWT riêng cho endpoint video công khai theo xác nhận của chủ tài khoản.
- Google Cloud project `gen-lang-client-0978471830`: key `LMS Student Playlist Sync` giới hạn YouTube Data API v3; giá trị chỉ lưu ở Supabase Secrets dưới tên `YOUTUBE_API_KEY`.
- Kiểm tra endpoint thành công: 48 video công khai, mới nhất là “Đám cưới chuột”; `updatedAt` lần đầu `2026-10-19T18:02:21.305Z` (01:02 ngày 20/10 giờ Việt Nam).
- Frontend triển khai qua GitHub `kieartist-collab/weblms` → Cloudflare Pages project `weblms`, địa chỉ `https://weblms.pages.dev`. Netlify trong tài liệu triển khai cũ không phải hosting hiện tại.

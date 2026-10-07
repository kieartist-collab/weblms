begin;
create table public.site_pages (
 slug text primary key check (slug in ('huong-dan-mua-khoa-hoc','chinh-sach-bao-hanh','chinh-sach-hoan-tien','mentor-1vs1')),
 title text not null check(length(title) between 1 and 200),
 body text not null check(length(body) <= 50000), updated_at timestamptz not null default now()
);
alter table public.site_pages enable row level security;
grant select on public.site_pages to anon,authenticated;
grant update(title,body,updated_at) on public.site_pages to authenticated;
create policy pages_read on public.site_pages for select to anon,authenticated using(true);
create policy pages_edit on public.site_pages for update to authenticated using(private.is_admin()) with check(private.is_admin());
insert into public.site_pages(slug,title,body) values
('huong-dan-mua-khoa-hoc','Hướng dẫn mua khóa học','1. Đăng nhập bằng Google và chọn khóa học phù hợp.

2. Bấm đăng ký để nhận số tiền và mã chuyển khoản của đơn hàng.

3. Chuyển khoản theo thông tin hiển thị. Nếu quét QR, hãy kiểm tra và điền đúng số tiền, nội dung chuyển khoản.

4. Bấm “Tôi đã chuyển khoản”. Đây là yêu cầu kiểm tra, chưa phải xác nhận thanh toán.

5. Sau khi đối soát, admin chia sẻ tài liệu Drive cho email đăng nhập và cấp quyền học. Bạn vào Góc học tập để bắt đầu.

Cần hỗ trợ: Kistein Do · 090.222.2612 · kieartist@gmail.com.'),
('chinh-sach-bao-hanh','Chính sách bảo hành','Hỗ trợ truy cập khóa học

Nếu gặp lỗi phát video, thiếu tài liệu hoặc không truy cập được khóa đã mua, hãy dùng nút Báo lỗi và mô tả bài học gặp sự cố. Đăng nhập Google Drive bằng đúng email được cấp quyền.

Kistein Do sẽ kiểm tra từng yêu cầu và trao đổi hướng xử lý. Phạm vi hỗ trợ chuyên môn và thời gian hỗ trợ cụ thể cần được xác nhận trước khi mua khóa học.

Liên hệ: 090.222.2612 · kieartist@gmail.com.'),
('chinh-sach-hoan-tien','Chính sách hoàn tiền','Yêu cầu hỗ trợ thanh toán và hoàn tiền

Trước khi thanh toán, vui lòng xem mô tả khóa học và liên hệ để xác nhận điều kiện hoàn tiền áp dụng cho khóa bạn chọn.

Nếu chuyển nhầm, thanh toán trùng hoặc gặp vấn đề với đơn hàng, gửi mã đơn, email đăng nhập và chứng từ thanh toán tới kieartist@gmail.com hoặc Zalo 090.222.2612. Không gửi mật khẩu hay mã OTP.

Yêu cầu được kiểm tra và phản hồi theo từng trường hợp. Việc gửi yêu cầu không đồng nghĩa đã được chấp thuận hoàn tiền; điều kiện, số tiền và thời gian xử lý sẽ được xác nhận trực tiếp.'),
('mentor-1vs1','Mentor 1vs1','Học và trao đổi trực tiếp cùng Kistein Do

Bạn có thể liên hệ để trao đổi nhu cầu hướng dẫn 3D, góp ý sản phẩm hoặc định hướng dự án cá nhân.

Hãy gửi mục tiêu, trình độ hiện tại, phần mềm đang dùng, sản phẩm tham khảo và thời gian phù hợp. Nội dung buổi học, lịch, chi phí và hình thức làm việc sẽ được thống nhất trước khi đăng ký.

Liên hệ Kistein Do qua Zalo 090.222.2612, email kieartist@gmail.com hoặc Facebook kieartist.');
create table public.bug_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id),
 message text not null check(length(trim(message)) between 10 and 5000),
 page_path text not null check(length(page_path)<=1000 and page_path like '/%'),
 image_path text check(image_path is null or image_path like user_id::text || '/%'),
 status text not null default 'new' check(status in ('new','resolved')),
 created_at timestamptz not null default now()
);
alter table public.bug_reports enable row level security;
grant select on public.bug_reports to authenticated;
grant insert(message,page_path,image_path) on public.bug_reports to authenticated;
grant update(status) on public.bug_reports to authenticated;
create policy reports_insert on public.bug_reports for insert to authenticated with check(user_id=auth.uid() and status='new');
create policy reports_read on public.bug_reports for select to authenticated using(private.is_admin() or user_id=auth.uid());
create policy reports_update on public.bug_reports for update to authenticated using(private.is_admin()) with check(private.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bug-reports','bug-reports',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy report_image_insert on storage.objects for insert to authenticated with check(bucket_id='bug-reports' and split_part(name,'/',1)=auth.uid()::text);
create policy report_image_read on storage.objects for select to authenticated using(bucket_id='bug-reports' and (private.is_admin() or split_part(name,'/',1)=auth.uid()::text));
create policy report_image_delete on storage.objects for delete to authenticated using(bucket_id='bug-reports' and split_part(name,'/',1)=auth.uid()::text);
commit;

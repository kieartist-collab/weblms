-- Optional sample catalog. No real videos, purchases, or bank details are seeded.
begin;
insert into public.courses(id,slug,title,summary,description,instructor,category,level,price,thumbnail_url,published) values
('10000000-0000-0000-0000-000000000001','unreal-engine-khong-gian-kien-truc','Unreal Engine 5: Từ ý tưởng đến không gian sống động','Xây dựng không gian kiến trúc, làm chủ ánh sáng và kể câu chuyện bằng hình ảnh.','NỘI DUNG MẪU — thay bằng chương trình của bạn trước khi bán. Lộ trình thực hành từ thiết lập dự án, dựng không gian, vật liệu đến ánh sáng và xuất phim.','Học viện Online','3D & Kiến trúc','Từ cơ bản',599000,'https://images.unsplash.com/photo-1549791084-5f78368b208b?auto=format&fit=crop&fm=jpg&q=85&w=1600',false),
('10000000-0000-0000-0000-000000000002','tu-duy-thiet-ke-hinh-anh','Tư duy thiết kế: Biến ý tưởng thành hình ảnh','Bố cục, màu sắc và typography qua những bài tập thiết kế thực tế.','NỘI DUNG MẪU — thay bằng chương trình của bạn trước khi bán.','Học viện Online','Thiết kế','Cho người mới',399000,'',false),
('10000000-0000-0000-0000-000000000003','ke-chuyen-bang-video','Kể chuyện bằng video: Những thước phim đầu tiên','Từ kịch bản đến dựng phim, tạo nên những câu chuyện có nhịp điệu và cảm xúc.','NỘI DUNG MẪU — thay bằng chương trình của bạn trước khi bán.','Học viện Online','Video & Sáng tạo','Từ cơ bản',499000,'https://images.unsplash.com/photo-1643804158917-3c9cae72881e?auto=format&fit=crop&fm=jpg&q=85&w=1000',false)
on conflict(id) do nothing;
insert into public.modules(id,course_id,title,position) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Bắt đầu với Unreal Engine',0),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Không gian, vật liệu và ánh sáng',1)
on conflict(id) do nothing;
insert into public.lessons(id,module_id,title,duration_minutes,position) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Làm quen với hành trình học',8,0),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Thiết lập dự án đầu tiên',15,1),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Xây dựng không gian kiến trúc',24,0),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','Ánh sáng tạo nên cảm xúc',20,1)
on conflict(id) do nothing;
insert into public.lesson_contents(lesson_id,body) select id,'Nội dung mẫu. Hãy thêm bài giảng và liên kết video Drive trong trang quản trị.' from public.lessons where module_id in('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002') on conflict do nothing;
commit;

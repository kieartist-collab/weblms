-- Run after 001_lms.sql. Public course thumbnails and payment QR images only.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('course-thumbnails','course-thumbnails',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy thumbnail_upload on storage.objects for insert to authenticated with check(bucket_id='course-thumbnails' and private.is_admin());
create policy thumbnail_update on storage.objects for update to authenticated using(bucket_id='course-thumbnails' and private.is_admin()) with check(bucket_id='course-thumbnails' and private.is_admin());
create policy thumbnail_delete on storage.objects for delete to authenticated using(bucket_id='course-thumbnails' and private.is_admin());
create policy thumbnail_read on storage.objects for select to anon,authenticated using(bucket_id='course-thumbnails');
commit;

begin;
alter table public.courses add column under_construction boolean not null default false;
create or replace function public.create_order(p_course uuid) returns public.orders language plpgsql security definer set search_path = '' as $$
declare o public.orders; c public.courses;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_course::text,0));
  select * into c from public.courses where id=p_course and published for share;
  if not found then raise exception 'Khóa học không khả dụng.'; end if;
  if c.under_construction then raise exception 'Khóa học đang được xây dựng, chưa mở đăng ký.'; end if;
  if exists(select 1 from public.enrollments where user_id=auth.uid() and course_id=p_course and active) then raise exception 'Bạn đã có quyền học.'; end if;
  select * into o from public.orders where user_id=auth.uid() and course_id=p_course and status in('pending','reported','paid');
  if found then return o; end if;
  if not exists(select 1 from public.settings where id=1 and trim(bank_name)<>'' and trim(bank_account)<>'' and trim(bank_owner)<>'') then raise exception 'Chưa có thông tin thanh toán. Vui lòng liên hệ giảng viên.'; end if;
  insert into public.orders(user_id,course_id,amount,transfer_code) values(auth.uid(),p_course,c.price,'HV'||upper(replace(gen_random_uuid()::text,'-',''))) returning * into o;
  return o;
end $$;

commit;

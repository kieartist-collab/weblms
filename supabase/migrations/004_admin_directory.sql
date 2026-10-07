-- Run after 001_lms.sql. Read-only admin queries; does not change orders or access.
begin;
create index if not exists orders_created_page on public.orders(created_at desc,id desc);
create index if not exists orders_user on public.orders(user_id);

create or replace function public.admin_directory(
  p_kind text, p_search text default '', p_status text default '', p_role text default '',
  p_course uuid default null, p_from date default null, p_to date default null,
  p_page integer default 1, p_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; total bigint; page_no integer; page_size integer; term text := lower(trim(coalesce(p_search,'')));
begin
  if not private.is_admin() then raise exception 'Chỉ quản trị viên được xem dữ liệu này'; end if;
  if p_kind not in ('orders','students') or p_kind is null then raise exception 'Danh sách không hợp lệ'; end if;
  if p_from > p_to then raise exception 'Ngày bắt đầu phải trước ngày kết thúc'; end if;
  page_size := least(100,greatest(1,coalesce(p_size,25)));
  page_no := greatest(1,coalesce(p_page,1));
  if p_kind='orders' then
    with filtered as (
      select o.id,o.user_id,o.course_id,o.amount,o.transfer_code,o.status,o.created_at,p.email,c.title as course_title
      from public.orders o join public.profiles p on p.id=o.user_id join public.courses c on c.id=o.course_id
      where (term='' or strpos(lower(p.email),term)>0 or strpos(lower(o.transfer_code),term)>0)
      and (coalesce(p_status,'')='' or o.status=p_status)
      and (p_course is null or o.course_id=p_course)
      and (p_from is null or o.created_at >= (p_from::timestamp at time zone 'Asia/Ho_Chi_Minh'))
      and (p_to is null or o.created_at < ((p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))
    ), counted as (select count(*) n from filtered), paged as (
      select * from filtered order by created_at desc,id desc limit page_size
      offset ((least(page_no,greatest(1,(select ceil(n::numeric/page_size)::int from counted)))-1)::bigint*page_size)
    ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from paged x),'[]'::jsonb),'total',n,
      'page',least(page_no,greatest(1,ceil(n::numeric/page_size)::int))) into result from counted;
  else
    with filtered as (
      select p.id,p.full_name,p.email,p.is_admin,
        (select count(*) from public.enrollments e where e.user_id=p.id and e.active) as active_courses,
        (select count(*) from public.enrollments e where e.user_id=p.id and e.drive_status='revoke_pending') as pending_drive
      from public.profiles p
      where (term='' or strpos(lower(p.email),term)>0 or strpos(lower(p.full_name),term)>0)
      and (coalesce(p_role,'')='' or (p_role='admin' and p.is_admin) or (p_role='student' and not p.is_admin))
      and (
        (coalesce(p_status,'')='' and p_course is null)
        or (p_status='none' and not exists(select 1 from public.enrollments e where e.user_id=p.id) and p_course is null)
        or exists(select 1 from public.enrollments e where e.user_id=p.id and (p_course is null or e.course_id=p_course)
          and (coalesce(p_status,'')='' or (p_status='active' and e.active) or (p_status='revoked' and not e.active and e.drive_status='revoked') or (p_status='revoke_pending' and e.drive_status='revoke_pending')))
      )
    ), counted as (select count(*) n from filtered), paged as (
      select * from filtered order by lower(email),id limit page_size
      offset ((least(page_no,greatest(1,(select ceil(n::numeric/page_size)::int from counted)))-1)::bigint*page_size)
    ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by lower(x.email),x.id) from paged x),'[]'::jsonb),'total',n,
      'page',least(page_no,greatest(1,ceil(n::numeric/page_size)::int))) into result from counted;
  end if;
  return result;
end $$;

create or replace function public.admin_student_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Chỉ quản trị viên được xem dữ liệu này'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.granted_at desc,x.course_id) from (
    select e.*,c.title as course_title,cp.drive_folder_url,
      (select count(*) from public.lessons l join public.modules m on m.id=l.module_id where m.course_id=e.course_id) as total_lessons,
      (select count(*) from public.progress pr join public.lessons l on l.id=pr.lesson_id join public.modules m on m.id=l.module_id
        where pr.user_id=e.user_id and pr.completed and m.course_id=e.course_id) as completed_lessons
    from public.enrollments e join public.courses c on c.id=e.course_id left join public.course_private cp on cp.course_id=e.course_id where e.user_id=p_user
  ) x),'[]'::jsonb);
end $$;
revoke all on function public.admin_directory(text,text,text,text,uuid,date,date,integer,integer) from public,anon;
revoke all on function public.admin_student_detail(uuid) from public,anon;
grant execute on function public.admin_directory(text,text,text,text,uuid,date,date,integer,integer) to authenticated;
grant execute on function public.admin_student_detail(uuid) to authenticated;
commit;

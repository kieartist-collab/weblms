-- Apply once through Supabase SQL Editor, as the project owner.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null, full_name text not null default '', is_admin boolean not null default false
);
create function private.sync_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do update set email=excluded.email, full_name=excluded.full_name;
  return new;
end $$;
create trigger sync_profile after insert or update of email, raw_user_meta_data on auth.users for each row execute function private.sync_profile();
insert into public.profiles(id,email,full_name) select id,coalesce(email,''),coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict do nothing;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and is_admin);
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check(length(trim(title))>0), summary text not null default '', description text not null default '',
  instructor text not null default 'Học viện Online', category text not null default 'Khóa học', level text not null default 'Từ cơ bản',
  price bigint not null default 0 check(price>=0 and price<=1000000000), thumbnail_url text not null default '',
  published boolean not null default false, created_at timestamptz not null default now()
);
create table public.course_private (
  course_id uuid primary key references public.courses on delete cascade,
  drive_folder_url text not null default '' check(drive_folder_url='' or drive_folder_url ~ '^https://drive[.]google[.]com/drive/(u/[0-9]+/)?folders/[a-zA-Z0-9_-]+')
);
create table public.modules (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses on delete cascade,
  title text not null check(length(trim(title))>0), position integer not null default 0
);
create index modules_course on public.modules(course_id);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), module_id uuid not null references public.modules on delete cascade,
  title text not null check(length(trim(title))>0), duration_minutes integer not null default 0 check(duration_minutes>=0), position integer not null default 0
);
create index lessons_module on public.lessons(module_id);
create table public.lesson_contents (
  lesson_id uuid primary key references public.lessons on delete cascade,
  body text not null default '', video_url text not null default '' check(video_url='' or video_url ~ '^https://drive[.]google[.]com/(file/d/[a-zA-Z0-9_-]+|open[?]id=[a-zA-Z0-9_-]+)')
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons on delete cascade,
  title text not null check(length(trim(title))>0), url text not null check(url ~ '^https://(drive|docs)[.]google[.]com/')
);
create index resources_lesson on public.resources(lesson_id);
create table public.settings (
  id integer primary key default 1 check(id=1), bank_name text not null default '', bank_account text not null default '',
  bank_owner text not null default '', bank_qr_url text not null default ''
);
insert into public.settings(id) values(1);
create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles,
  course_id uuid not null references public.courses, amount bigint not null check(amount>=0),
  transfer_code text unique not null, status text not null default 'pending' check(status in('pending','reported','paid','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);
create unique index one_open_order on public.orders(user_id,course_id) where status in('pending','reported','paid');
create index orders_course on public.orders(course_id);
create table public.enrollments (
  user_id uuid not null references public.profiles, course_id uuid not null references public.courses,
  active boolean not null default true, drive_status text not null check(drive_status in('shared','revoke_pending','revoked')),
  drive_email text not null, granted_at timestamptz not null default now(), primary key(user_id,course_id),
  check((active and drive_status='shared') or (not active and drive_status in('revoke_pending','revoked')))
);
create index enrollments_course on public.enrollments(course_id);
create table public.progress (
  user_id uuid not null references public.profiles on delete cascade, lesson_id uuid not null references public.lessons on delete cascade,
  completed boolean not null default false, last_seen_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles,
  action text not null, target_id text not null, created_at timestamptz not null default now()
);

create function private.can_learn(p_course uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists(select 1 from public.enrollments e join public.courses c on c.id=e.course_id where e.user_id=auth.uid() and e.course_id=p_course and e.active and c.published);
$$;
create function private.can_read_lesson(p_lesson uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=p_lesson and private.can_learn(m.course_id));
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_private enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.resources enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.audit_log enable row level security;

create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin());
create policy catalog_read on public.courses for select to anon,authenticated using(published or private.is_admin());
create policy course_edit on public.courses for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy folder_admin on public.course_private for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy module_read on public.modules for select to anon,authenticated using(exists(select 1 from public.courses c where c.id=course_id));
create policy module_edit on public.modules for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy lesson_read on public.lessons for select to anon,authenticated using(exists(select 1 from public.modules m where m.id=module_id));
create policy lesson_edit on public.lessons for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy content_read on public.lesson_contents for select to authenticated using(private.can_read_lesson(lesson_id));
create policy content_edit on public.lesson_contents for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy resource_read on public.resources for select to authenticated using(private.can_read_lesson(lesson_id));
create policy resource_edit on public.resources for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy settings_read on public.settings for select to authenticated using(true);
create policy settings_edit on public.settings for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy orders_read on public.orders for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy enrollment_read on public.enrollments for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy progress_read on public.progress for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy audit_read on public.audit_log for select to authenticated using(private.is_admin());

-- Explicit privileges: financial/access/progress writes are RPC-only.
revoke all on public.profiles,public.courses,public.course_private,public.modules,public.lessons,public.lesson_contents,public.resources,public.settings,public.orders,public.enrollments,public.progress,public.audit_log from anon,authenticated;
grant select on public.courses,public.modules,public.lessons to anon,authenticated;
grant select on public.profiles,public.course_private,public.lesson_contents,public.resources,public.settings,public.orders,public.enrollments,public.progress,public.audit_log to authenticated;
grant insert,update,delete on public.courses,public.course_private,public.modules,public.lessons,public.lesson_contents,public.resources to authenticated;
grant update on public.settings to authenticated;

create function public.create_order(p_course uuid) returns public.orders language plpgsql security definer set search_path = '' as $$
declare o public.orders; c public.courses;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_course::text,0));
  select * into c from public.courses where id=p_course and published;
  if not found then raise exception 'Khóa học không khả dụng.'; end if;
  if exists(select 1 from public.enrollments where user_id=auth.uid() and course_id=p_course and active) then raise exception 'Bạn đã có quyền học.'; end if;
  select * into o from public.orders where user_id=auth.uid() and course_id=p_course and status in('pending','reported','paid');
  if found then return o; end if;
  if not exists(select 1 from public.settings where id=1 and trim(bank_name)<>'' and trim(bank_account)<>'' and trim(bank_owner)<>'') then raise exception 'Chưa có thông tin thanh toán. Vui lòng liên hệ giảng viên.'; end if;
  insert into public.orders(user_id,course_id,amount,transfer_code) values(auth.uid(),p_course,c.price,'HV'||upper(replace(gen_random_uuid()::text,'-',''))) returning * into o;
  return o;
end $$;
create function public.report_payment(p_order uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.orders where id=p_order and user_id=auth.uid()) then raise exception 'Không có quyền truy cập đơn hàng.'; end if;
  update public.orders set status='reported' where id=p_order and user_id=auth.uid() and status='pending';
end $$;
create function public.admin_order_action(p_order uuid,p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders; learner_email text;
begin
  if not private.is_admin() then raise exception 'Chỉ admin được thực hiện.'; end if;
  select * into o from public.orders where id=p_order for update;
  if not found then raise exception 'Không tìm thấy đơn hàng.'; end if;
  -- Same lock as revocation serializes grant/revoke operations across orders.
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text||o.course_id::text,0));
  if p_action='confirm_payment' then
    if o.status in('paid','fulfilled') then return; end if;
    if o.status not in('pending','reported') then raise exception 'Đơn hàng không thể duyệt.'; end if;
    update public.orders set status='paid' where id=p_order;
  elsif p_action='grant_access' then
    if o.status='fulfilled' then return; end if;
    if o.status<>'paid' then raise exception 'Cần xác nhận thanh toán trước.'; end if;
    select email into learner_email from public.profiles where id=o.user_id;
    insert into public.enrollments(user_id,course_id,active,drive_status,drive_email) values(o.user_id,o.course_id,true,'shared',learner_email)
    on conflict(user_id,course_id) do update set active=true,drive_status='shared',drive_email=excluded.drive_email,granted_at=now();
    update public.orders set status='fulfilled' where id=p_order;
  elsif p_action='cancel' then
    if o.status='cancelled' then return; end if;
    if o.status not in('pending','reported') then raise exception 'Không hủy đơn đã nhận tiền.'; end if;
    update public.orders set status='cancelled' where id=p_order;
  else raise exception 'Thao tác không hợp lệ.';
  end if;
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),p_action,p_order::text);
end $$;
create function public.admin_access_action(p_user uuid,p_course uuid,p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare e public.enrollments;
begin
  if not private.is_admin() then raise exception 'Chỉ admin được thực hiện.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_course::text,0));
  select * into e from public.enrollments where user_id=p_user and course_id=p_course for update;
  if not found then raise exception 'Không tìm thấy quyền học.'; end if;
  if p_action='revoke' then
    if not e.active then return; end if;
    update public.enrollments set active=false,drive_status='revoke_pending' where user_id=p_user and course_id=p_course;
  elsif p_action='confirm_drive_revoked' then
    if e.drive_status='revoked' then return; end if;
    if e.active then raise exception 'Hãy khóa quyền học trước.'; end if;
    update public.enrollments set drive_status='revoked' where user_id=p_user and course_id=p_course;
  else raise exception 'Thao tác không hợp lệ.';
  end if;
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),p_action,p_user::text||'/'||p_course::text);
end $$;
create function public.record_progress(p_lesson uuid,p_completed boolean default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.can_read_lesson(p_lesson) then raise exception 'Bạn chưa có quyền học bài này.'; end if;
  insert into public.progress(user_id,lesson_id,completed) values(auth.uid(),p_lesson,coalesce(p_completed,false))
  on conflict(user_id,lesson_id) do update set completed=coalesce(p_completed,public.progress.completed),last_seen_at=now();
end $$;

-- Restrict security-definer functions, including trigger entry points.
revoke all on all functions in schema private from public;
grant execute on function private.is_admin(),private.can_learn(uuid),private.can_read_lesson(uuid) to anon,authenticated;
revoke all on function public.create_order(uuid),public.report_payment(uuid),public.admin_order_action(uuid,text),public.admin_access_action(uuid,uuid,text),public.record_progress(uuid,boolean) from public,anon;
grant execute on function public.create_order(uuid),public.report_payment(uuid),public.admin_order_action(uuid,text),public.admin_access_action(uuid,uuid,text),public.record_progress(uuid,boolean) to authenticated;
commit;

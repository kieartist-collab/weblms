begin;
-- Private administrative attribution, kept separate from the public catalog.
create table public.course_creators (
  course_id uuid primary key references public.courses on delete cascade,
  user_id uuid references public.profiles on delete set null,
  creator_name text not null,
  recorded_at timestamptz not null default now()
);
alter table public.course_creators enable row level security;
revoke all on public.course_creators from anon,authenticated;
grant select on public.course_creators to authenticated;
create policy creator_admin_read on public.course_creators for select to authenticated using(private.is_admin());
create function private.record_course_creator() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null then
    insert into public.course_creators(course_id,user_id,creator_name)
    select new.id,id,coalesce(nullif(trim(full_name),''),email) from public.profiles where id=auth.uid();
  end if;
  return new;
end $$;
create trigger record_course_creator after insert on public.courses
for each row execute function private.record_course_creator();
-- Historical courses cannot be reliably attributed from the editable instructor field.
-- Existing RLS deliberately allows every current admin to edit every course.
create or replace function public.admin_import_course(p_course uuid, p_slug text, p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare cid uuid; mid uuid; lid uuid; item jsonb; info jsonb; module_map jsonb := '{}'; lesson_map jsonb := '{}'; idx integer := 0; teacher text;
begin
  if not private.is_admin() then raise exception 'Chỉ quản trị viên được nhập khóa học.'; end if;
  if p_data is null or pg_column_size(p_data)>2000000 or jsonb_typeof(p_data)<>'object'
    or jsonb_typeof(p_data->'course') is distinct from 'object'
    or jsonb_typeof(p_data->'modules') is distinct from 'array'
    or jsonb_typeof(p_data->'lessons') is distinct from 'array'
    or jsonb_typeof(p_data->'resources') is distinct from 'array' then raise exception 'Dữ liệu nhập không hợp lệ.'; end if;
  if jsonb_array_length(p_data->'modules') not between 1 and 100 or jsonb_array_length(p_data->'lessons') not between 1 and 1000 or jsonb_array_length(p_data->'resources')>2000 then raise exception 'Số lượng chương/bài/tài liệu không hợp lệ.'; end if;
  info := p_data->'course';
  if length(trim(coalesce(info->>'title',''))) not between 1 and 250
    or length(trim(coalesce(info->>'category',''))) not between 1 and 250
    or coalesce(info->>'level','') not in ('Cơ bản','Khá','Nâng cao')
    or coalesce(info->>'price','') !~ '^[0-9]+$'
    or length(coalesce(info->>'summary',''))>2000 or length(coalesce(info->>'description',''))>30000 then raise exception 'Thông tin khóa học không hợp lệ.'; end if;
  select coalesce(nullif(trim(full_name),''),email) into teacher from public.profiles where id=auth.uid();
  if p_course is null then
    insert into public.courses(slug,title,category,level,price,summary,description,instructor,published)
    values(p_slug,info->>'title',info->>'category',info->>'level',(info->>'price')::bigint,coalesce(info->>'summary',''),coalesce(info->>'description',''),teacher,false) returning id into cid;
  else
    perform 1 from public.courses where id=p_course and not published for update;
    if not found then raise exception 'Chỉ nhập vào khóa học nháp.'; end if;
    if exists(select 1 from public.modules where course_id=p_course)
      or exists(select 1 from public.orders where course_id=p_course)
      or exists(select 1 from public.enrollments where course_id=p_course) then raise exception 'Khóa học đã có chương, đơn hàng hoặc quyền học. Hãy tạo khóa học nháp mới để nhập, tránh ghi đè dữ liệu.'; end if;
    cid := p_course;
    update public.courses set title=info->>'title',category=info->>'category',level=info->>'level',price=(info->>'price')::bigint,
      summary=coalesce(info->>'summary',''),description=coalesce(info->>'description','') where id=cid;
  end if;
  for item in select value from jsonb_array_elements(p_data->'modules') loop
    if coalesce(item->>'code','') !~ '^[A-Za-z0-9_-]{1,50}$' or module_map ? (item->>'code') or length(trim(coalesce(item->>'title',''))) not between 1 and 250 then raise exception 'Mã/tên chương không hợp lệ hoặc trùng.'; end if;
    insert into public.modules(course_id,title,position) values(cid,item->>'title',idx) returning id into mid;
    module_map := module_map || jsonb_build_object(item->>'code',mid); idx := idx+1;
  end loop;
  idx := 0;
  for item in select value from jsonb_array_elements(p_data->'lessons') loop
    if coalesce(item->>'code','') !~ '^[A-Za-z0-9_-]{1,50}$' or lesson_map ? (item->>'code') or not (module_map ? coalesce(item->>'module',''))
      or length(trim(coalesce(item->>'title',''))) not between 1 and 250 or coalesce(item->>'duration','') !~ '^[0-9]+$'
      or (item->>'duration')::integer>10000 or length(coalesce(item->>'body',''))>30000 then raise exception 'Bài học không hợp lệ hoặc mã bị trùng.'; end if;
    insert into public.lessons(module_id,title,duration_minutes,position) values((module_map->>(item->>'module'))::uuid,item->>'title',(item->>'duration')::integer,idx) returning id into lid;
    insert into public.lesson_contents(lesson_id,video_url,body) values(lid,coalesce(item->>'video',''),coalesce(item->>'body',''));
    lesson_map := lesson_map || jsonb_build_object(item->>'code',lid); idx:=idx+1;
  end loop;
  for item in select value from jsonb_array_elements(p_data->'resources') loop
    if not (lesson_map ? coalesce(item->>'lesson','')) or length(trim(coalesce(item->>'title',''))) not between 1 and 250 then raise exception 'Tài liệu không hợp lệ.'; end if;
    insert into public.resources(lesson_id,title,url) values((lesson_map->>(item->>'lesson'))::uuid,item->>'title',item->>'url');
  end loop;
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'import_course',cid::text);
  return cid;
end $$;

commit;

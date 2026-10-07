begin;
create or replace function public.admin_move_curriculum(p_course uuid,p_kind text,p_item uuid,p_target uuid,p_index integer)
returns void language plpgsql security definer set search_path='' as $$
declare src uuid; ids uuid[]; target_ids uuid[]; n integer;
begin
 if not private.is_admin() then raise exception 'Chỉ quản trị viên được sắp xếp'; end if;
 perform 1 from public.courses where id=p_course for update;
 if not found then raise exception 'Không tìm thấy khóa học'; end if;
 if p_index is null or p_index<0 then raise exception 'Vị trí không hợp lệ'; end if;
 if p_kind='module' then
  if not exists(select 1 from public.modules where id=p_item and course_id=p_course) then raise exception 'Chương không thuộc khóa học'; end if;
  select coalesce(array_agg(id order by position,id),'{}'::uuid[]) into ids from public.modules where course_id=p_course and id<>p_item;
  n:=least(p_index,cardinality(ids));
  ids:=ids[1:n]||array[p_item]||ids[n+1:cardinality(ids)];
  update public.modules m set position=x.pos-1 from unnest(ids) with ordinality x(id,pos) where m.id=x.id;
 elsif p_kind='lesson' then
  select l.module_id into src from public.lessons l join public.modules m on m.id=l.module_id where l.id=p_item and m.course_id=p_course;
  if src is null or not exists(select 1 from public.modules where id=p_target and course_id=p_course) then raise exception 'Bài hoặc chương không thuộc khóa học'; end if;
  select coalesce(array_agg(id order by position,id),'{}'::uuid[]) into ids from public.lessons where module_id=p_target and id<>p_item;
  n:=least(p_index,cardinality(ids));
  ids:=ids[1:n]||array[p_item]||ids[n+1:cardinality(ids)];
  update public.lessons l set module_id=p_target,position=x.pos-1 from unnest(ids) with ordinality x(id,pos) where l.id=x.id;
  if src<>p_target then
   with ranked as (select id,row_number() over(order by position,id)-1 pos from public.lessons where module_id=src)
   update public.lessons l set position=r.pos from ranked r where l.id=r.id;
  end if;
 else raise exception 'Loại không hợp lệ'; end if;
 insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'reorder_'||p_kind,p_item::text);
end $$;
revoke all on function public.admin_move_curriculum(uuid,text,uuid,uuid,integer) from public,anon;
grant execute on function public.admin_move_curriculum(uuid,text,uuid,uuid,integer) to authenticated;
commit;

-- Run once in Supabase SQL Editor as the project owner.
begin;
create or replace function public.admin_set_role(p_user uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  -- Serialize role changes, then re-check the caller's current database role.
  perform pg_catalog.pg_advisory_xact_lock(730031);
  if not private.is_admin() then raise exception 'Chỉ quản trị viên được thay đổi quyền.'; end if;
  if p_is_admin is null then raise exception 'Quyền không hợp lệ.'; end if;
  select * into target from public.profiles where id=p_user for update;
  if not found then raise exception 'Tài khoản chưa tồn tại. Người nhận cần đăng nhập Google trên website trước.'; end if;
  if target.is_admin=p_is_admin then return; end if;
  if p_user=auth.uid() and not p_is_admin then raise exception 'Không thể tự thu hồi quyền quản trị của mình.'; end if;
  if not p_is_admin and (select count(*) from public.profiles where is_admin) <= 1 then
    raise exception 'Phải giữ ít nhất một quản trị viên.';
  end if;
  update public.profiles set is_admin=p_is_admin where id=p_user;
  insert into public.audit_log(actor_id,action,target_id)
    values(auth.uid(),case when p_is_admin then 'grant_admin' else 'revoke_admin' end,p_user::text);
end $$;
revoke all on function public.admin_set_role(uuid,boolean) from public,anon;
grant execute on function public.admin_set_role(uuid,boolean) to authenticated;
commit;

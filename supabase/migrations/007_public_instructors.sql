-- Public instructor directory: expose display names only, never account emails.
begin;
create or replace function public.list_public_instructors()
returns table(full_name text)
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(p.full_name), ''), 'Giảng viên')
  from public.profiles p
  where p.is_admin = true
  order by lower(p.full_name), p.id;
$$;
revoke all on function public.list_public_instructors() from public;
grant execute on function public.list_public_instructors() to anon, authenticated;
commit;

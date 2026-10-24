begin;
create table public.order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  recipient_id uuid not null,
  audience text not null check (audience in ('admin','customer')),
  event text not null check (event in ('pending','reported','paid','fulfilled','cancelled')),
  recipient text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','skipped')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_token uuid,
  sent_at timestamptz,
  provider_id text,
  last_error text,
  unique(order_id,recipient_id,audience,event)
);
create index order_emails_due on public.order_emails(status,next_attempt_at);
alter table public.order_emails enable row level security;
revoke all on public.order_emails from anon,authenticated;
grant select on public.order_emails to authenticated;
grant all on public.order_emails to service_role;
create policy admin_email_read on public.order_emails for select to authenticated using(private.is_admin());

create function private.queue_order_emails() returns trigger language plpgsql security definer set search_path='' as $$
declare details jsonb;
begin
  if TG_OP='UPDATE' then
    if new.status=old.status then return new; end if;
  end if;
  -- Email queueing must never block creating or updating the order itself.
  begin
    select jsonb_build_object('course_title',c.title,'amount',new.amount,'transfer_code',new.transfer_code,
      'customer_name',p.full_name,'customer_email',p.email,'bank_name',s.bank_name,
      'bank_account',s.bank_account,'bank_owner',s.bank_owner)
    into details from public.courses c join public.profiles p on p.id=new.user_id
    left join public.settings s on s.id=1 where c.id=new.course_id;
    if details is null then
      raise warning 'Không tạo email cho đơn %: thiếu dữ liệu khóa học hoặc khách hàng.', new.id;
      return new;
    end if;
    -- Recipients without a usable address are recorded as skipped instead of failing at the provider.
    insert into public.order_emails(order_id,recipient_id,audience,event,recipient,payload,status,last_error)
    select new.id,p.id,'customer',new.status,p.email,details,
      case when p.email ~ '^[^@[:space:]]+@[^@[:space:]]+$' then 'pending' else 'skipped' end,
      case when p.email ~ '^[^@[:space:]]+@[^@[:space:]]+$' then null else 'Tài khoản không có địa chỉ email hợp lệ.' end
    from public.profiles p where p.id=new.user_id
    on conflict do nothing;
    if new.status in ('pending','reported') then
      insert into public.order_emails(order_id,recipient_id,audience,event,recipient,payload,status,last_error)
      select new.id,p.id,'admin',new.status,p.email,details,
        case when p.email ~ '^[^@[:space:]]+@[^@[:space:]]+$' then 'pending' else 'skipped' end,
        case when p.email ~ '^[^@[:space:]]+@[^@[:space:]]+$' then null else 'Tài khoản không có địa chỉ email hợp lệ.' end
      from public.profiles p where p.is_admin
      on conflict do nothing;
    end if;
  exception when others then
    raise warning 'Không tạo email cho đơn %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
create trigger order_email_events after insert or update of status on public.orders
for each row execute function private.queue_order_emails();

create function public.claim_order_emails() returns setof public.order_emails
language plpgsql security definer set search_path='' as $$
begin
  -- Never automatically retry outside the provider's 24-hour idempotency window.
  update public.order_emails set status='failed',last_error='Đã dừng thử lại; cần kiểm tra lịch sử nhà cung cấp.'
  where status in ('pending','processing') and (attempts>=8 or first_attempt_at < now()-interval '23 hours')
    and (status='pending' or locked_at < now()-interval '5 minutes');
  update public.order_emails e set status='skipped',last_error='Tài khoản đã bị thu hồi quyền admin.'
  where e.audience='admin' and e.status in ('pending','processing')
    and not exists(select 1 from public.profiles p where p.id=e.recipient_id and p.is_admin);
  return query
  update public.order_emails e set status='processing',attempts=e.attempts+1,locked_at=now(),
    lock_token=gen_random_uuid(),first_attempt_at=coalesce(e.first_attempt_at,now())
  where e.id in (select q.id from public.order_emails q
    where (q.status='pending' and q.next_attempt_at<=now())
       or (q.status='processing' and q.locked_at<now()-interval '5 minutes')
    order by q.created_at,q.id for update skip locked limit 5)
  returning e.*;
end $$;
revoke all on function public.claim_order_emails() from public,anon,authenticated;
grant execute on function public.claim_order_emails() to service_role;

create function public.admin_retry_order_email(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Chỉ admin được thực hiện.'; end if;
  update public.order_emails set status='pending',next_attempt_at=now(),last_error=null
  where id=p_id and status='failed' and attempts<8 and first_attempt_at>now()-interval '23 hours';
  if not found then raise exception 'Không thể gửi lại. Hãy kiểm tra lịch sử nhà cung cấp trước để tránh gửi trùng.'; end if;
end $$;
revoke all on function public.admin_retry_order_email(uuid) from public,anon;
grant execute on function public.admin_retry_order_email(uuid) to authenticated;
commit;

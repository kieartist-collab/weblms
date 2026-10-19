create table if not exists public.student_video_cache (
  id boolean primary key default true check (id),
  videos jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  refresh_after timestamptz not null default now()
);
alter table public.student_video_cache enable row level security;
revoke all on public.student_video_cache from anon, authenticated;
insert into public.student_video_cache(id) values (true) on conflict do nothing;

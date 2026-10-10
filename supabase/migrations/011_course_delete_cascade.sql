-- Does not delete existing records. Future admin course deletions also remove
-- orders and enrollments atomically. Existing curriculum/progress cascades apply.
begin;
alter table public.orders drop constraint orders_course_id_fkey;
alter table public.orders add constraint orders_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete cascade;
alter table public.enrollments drop constraint enrollments_course_id_fkey;
alter table public.enrollments add constraint enrollments_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete cascade;
commit;

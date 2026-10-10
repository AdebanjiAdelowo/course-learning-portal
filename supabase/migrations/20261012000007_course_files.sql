-- Private storage for course files (slides, notebooks, datasets, solution sheets).
--
-- Files in the application's /public folder can be opened by anyone who has the address. Files
-- in this bucket cannot: the bucket is private, and the policies below let only staff and
-- students with an active enrolment read it. The application hands out short-lived signed
-- links through /learn/files/<path> (see src/app/learn/files).

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', false, 52428800)
on conflict (id) do nothing;

create function public.has_active_enrolment() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid()) and e.status in ('active', 'completed')
  );
$$;
revoke all on function public.has_active_enrolment() from public, anon;
grant execute on function public.has_active_enrolment() to authenticated, service_role;

create policy course_files_read on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and (public.is_staff() or public.has_active_enrolment()));

create policy course_files_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_staff());

create policy course_files_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and public.is_staff())
  with check (bucket_id = 'course-files' and public.is_staff());

create policy course_files_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and public.is_staff());

-- Private course files belong to a course.
--
-- The first policy allowed any student with an active enrolment in any course to read every
-- file in the bucket. A student withdrawn from one course but enrolled in another could
-- therefore still download the first course's files.
--
-- Files are now stored under a folder named after their course's slug:
--     course-files/<course-slug>/<path>
-- and a student may read a file only with an active or completed enrolment in that course.
-- Staff can read everything, as before.

create function public.can_read_course_file(p_object_name text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() or exists (
    select 1
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = (select auth.uid())
      and e.status in ('active', 'completed')
      and c.is_published
      -- An object at the top level of the bucket has no course folder and matches no slug.
      and position('/' in p_object_name) > 1
      and c.slug = split_part(p_object_name, '/', 1)
  );
$$;
revoke all on function public.can_read_course_file(text) from public, anon;
grant execute on function public.can_read_course_file(text) to authenticated, service_role;

drop policy course_files_read on storage.objects;
create policy course_files_read on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and public.can_read_course_file(name));

-- Superseded by can_read_course_file.
drop function public.has_active_enrolment();

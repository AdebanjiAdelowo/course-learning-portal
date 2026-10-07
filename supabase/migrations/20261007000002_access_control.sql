-- Grants, helper functions and row-level security.
--
-- Model:
--   * anon            no table access at all; the public site reads one curated function.
--   * authenticated   students and staff; every table is filtered by RLS.
--   * service_role    server-only key; used for seeding, quiz grading and account administration.
--
-- Students can read published course material for courses they are enrolled in, and only their
-- own progress, attempts, submissions and feedback. Staff (instructor, admin) can read and manage
-- everything.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies do not recurse into RLS)
-- ---------------------------------------------------------------------------

create function public.is_staff() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('instructor', 'admin')
  );
$$;

create function public.is_enrolled(p_course_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid())
      and e.course_id = p_course_id
      and e.status in ('active', 'completed')
  );
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_enrolled(uuid) from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_enrolled(uuid) to authenticated, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges (RLS narrows these further)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

grant select on
  public.profiles, public.courses, public.enrollments, public.modules, public.lessons,
  public.lesson_progress, public.quizzes, public.questions, public.question_keys,
  public.quiz_attempts, public.projects, public.submissions, public.live_sessions,
  public.resources, public.announcements, public.feedback, public.contact_messages
to authenticated;

-- Content tables: writable by staff only (enforced by the policies below).
grant insert, update, delete on
  public.courses, public.enrollments, public.modules, public.lessons, public.quizzes,
  public.questions, public.question_keys, public.projects, public.live_sessions,
  public.resources, public.announcements, public.feedback
to authenticated;

grant delete on public.contact_messages to authenticated;

-- Column-level grants stop a student from touching fields they do not own, whatever RLS says:
-- a profile's role and email, and a submission's owner, project and timestamps.
grant update (full_name, timezone, bio) on public.profiles to authenticated;
grant insert, delete on public.lesson_progress to authenticated;
grant insert (project_id, user_id, status, work_url, notes) on public.submissions to authenticated;
grant update (status, work_url, notes) on public.submissions to authenticated;
-- quiz_attempts: no insert/update for authenticated. Attempts are graded and written by the
-- server with the service role, so a student cannot forge a score.

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.projects enable row level security;
alter table public.submissions enable row level security;
alter table public.live_sessions enable row level security;
alter table public.resources enable row level security;
alter table public.announcements enable row level security;
alter table public.feedback enable row level security;
alter table public.contact_messages enable row level security;

-- profiles
-- Students see their own profile and those of staff (so feedback can show who wrote it),
-- never each other's.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or role in ('instructor', 'admin')
    or (select public.is_staff())
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- courses
create policy courses_select on public.courses for select to authenticated
  using ((is_published and public.is_enrolled(id)) or (select public.is_staff()));
create policy courses_staff_write on public.courses for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- enrollments
create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy enrollments_staff_write on public.enrollments for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- modules, lessons, quizzes, projects: published material for enrolled students
create policy modules_select on public.modules for select to authenticated
  using ((is_published and public.is_enrolled(course_id)) or (select public.is_staff()));
create policy modules_staff_write on public.modules for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy lessons_select on public.lessons for select to authenticated
  using ((is_published and public.is_enrolled(course_id)) or (select public.is_staff()));
create policy lessons_staff_write on public.lessons for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy quizzes_select on public.quizzes for select to authenticated
  using ((is_published and public.is_enrolled(course_id)) or (select public.is_staff()));
create policy quizzes_staff_write on public.quizzes for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy projects_select on public.projects for select to authenticated
  using ((is_published and public.is_enrolled(course_id)) or (select public.is_staff()));
create policy projects_staff_write on public.projects for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- questions: visible with their quiz. Answer keys: staff only.
create policy questions_select on public.questions for select to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.is_published and public.is_enrolled(q.course_id)
    )
  );
create policy questions_staff_write on public.questions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy question_keys_staff_only on public.question_keys for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- lesson_progress: a student owns their rows and can only mark lessons they can see
create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy lesson_progress_insert_own on public.lesson_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published and public.is_enrolled(l.course_id)
    )
  );
create policy lesson_progress_delete_own on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- quiz_attempts: read-only for their owner
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- submissions: a student edits their own work until it has been reviewed
create policy submissions_select on public.submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy submissions_insert_own on public.submissions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status in ('in_progress', 'submitted')
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.is_published and public.is_enrolled(p.course_id)
    )
  );
create policy submissions_update_own on public.submissions for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'reviewed')
  with check (user_id = (select auth.uid()) and status in ('in_progress', 'submitted'));
create policy submissions_staff_update on public.submissions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- live sessions, resources, announcements
create policy live_sessions_select on public.live_sessions for select to authenticated
  using (public.is_enrolled(course_id) or (select public.is_staff()));
create policy live_sessions_staff_write on public.live_sessions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy resources_select on public.resources for select to authenticated
  using (public.is_enrolled(course_id) or (select public.is_staff()));
create policy resources_staff_write on public.resources for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy announcements_select on public.announcements for select to authenticated
  using (
    (published_at <= now() and public.is_enrolled(course_id)) or (select public.is_staff())
  );
create policy announcements_staff_write on public.announcements for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- feedback: written by staff, read by the student it is addressed to
create policy feedback_select on public.feedback for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_staff()));
create policy feedback_staff_write on public.feedback for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- contact messages: written by the server, read by staff
create policy contact_messages_staff_select on public.contact_messages for select to authenticated
  using ((select public.is_staff()));
create policy contact_messages_staff_delete on public.contact_messages for delete to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- RPC: mark feedback as read (students cannot update feedback rows directly)
-- ---------------------------------------------------------------------------

create function public.mark_feedback_read(p_feedback_ids uuid[]) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.feedback f
  set read_at = now()
  where f.id = any (p_feedback_ids)
    and f.student_id = (select auth.uid())
    and f.read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_feedback_read(uuid[]) from public, anon;
grant execute on function public.mark_feedback_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: course search (security invoker, so RLS decides what can be found)
-- ---------------------------------------------------------------------------

create function public.search_course(p_course_id uuid, p_query text, p_limit integer default 24)
returns table (
  kind text,
  id uuid,
  slug text,
  title text,
  snippet text,
  context text,
  url text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      websearch_to_tsquery('english', p_query) as tsq,
      '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  hits as (
    select 'lesson'::text as kind, l.id, l.slug, l.title, l.summary as snippet, m.title as context,
           null::text as url,
           ts_rank(l.search, q.tsq) + case when l.title ilike q.pattern then 1 else 0 end as rank
    from public.lessons l
    join public.modules m on m.id = l.module_id
    cross join q
    where l.course_id = p_course_id and l.is_published and m.is_published
      and (l.search @@ q.tsq or l.title ilike q.pattern)
    union all
    select 'module', m.id, m.slug, m.title, m.description, 'Module ' || m.position, null,
           ts_rank(m.search, q.tsq) + case when m.title ilike q.pattern then 1 else 0 end
    from public.modules m cross join q
    where m.course_id = p_course_id and m.is_published
      and (m.search @@ q.tsq or m.title ilike q.pattern)
    union all
    select 'project', p.id, p.slug, p.title, p.summary, m.title, null,
           ts_rank(p.search, q.tsq) + case when p.title ilike q.pattern then 1 else 0 end
    from public.projects p
    join public.modules m on m.id = p.module_id
    cross join q
    where p.course_id = p_course_id and p.is_published
      and (p.search @@ q.tsq or p.title ilike q.pattern)
    union all
    select 'resource', r.id, null, r.title, r.description, r.kind::text, r.url,
           ts_rank(r.search, q.tsq) + case when r.title ilike q.pattern then 1 else 0 end
    from public.resources r cross join q
    where r.course_id = p_course_id
      and (r.search @@ q.tsq or r.title ilike q.pattern)
  )
  select h.kind, h.id, h.slug, h.title, h.snippet, h.context, h.url, h.rank::real
  from hits h
  where char_length(trim(p_query)) >= 2
  order by h.rank desc, h.title
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on function public.search_course(uuid, text, integer) from public, anon;
grant execute on function public.search_course(uuid, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: the only thing the public website can read. Titles and descriptions of a published
-- course, never lesson bodies, quizzes or anything about students.
-- ---------------------------------------------------------------------------

create function public.public_course_outline(p_slug text) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', c.slug,
    'title', c.title,
    'subtitle', c.subtitle,
    'description', c.description,
    'level', c.level,
    'duration_weeks', c.duration_weeks,
    'outcomes', to_jsonb(c.outcomes),
    'prerequisites', to_jsonb(c.prerequisites),
    'instructor', (
      select jsonb_build_object('full_name', p.full_name, 'bio', p.bio)
      from public.profiles p where p.id = c.instructor_id
    ),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', m.position,
        'title', m.title,
        'description', m.description,
        'lessons', coalesce((
          select jsonb_agg(jsonb_build_object('title', l.title, 'duration_minutes', l.duration_minutes)
                           order by l.position)
          from public.lessons l where l.module_id = m.id and l.is_published
        ), '[]'::jsonb),
        'quiz_count', (select count(*) from public.quizzes z where z.module_id = m.id and z.is_published),
        'projects', coalesce((
          select jsonb_agg(pr.title order by pr.due_at nulls last, pr.title)
          from public.projects pr where pr.module_id = m.id and pr.is_published
        ), '[]'::jsonb)
      ) order by m.position)
      from public.modules m where m.course_id = c.id and m.is_published
    ), '[]'::jsonb)
  )
  from public.courses c
  where c.slug = p_slug and c.is_published;
$$;

revoke all on function public.public_course_outline(text) from public;
grant execute on function public.public_course_outline(text) to anon, authenticated, service_role;

-- Tables created by later migrations get no API privileges unless a migration grants them.
alter default privileges in schema public revoke all on tables from anon, authenticated;

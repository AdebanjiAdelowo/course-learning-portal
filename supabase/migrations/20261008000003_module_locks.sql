-- Content access and safe curriculum previews have separate database surfaces.
create function public.can_access_module(p_module_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.modules m join public.courses c on c.id=m.course_id
    where m.id=p_module_id and m.is_published and c.is_published
      and public.is_enrolled(m.course_id)
      and (m.available_from is null or m.available_from <= now())
      and (not m.requires_previous or not exists (
        select 1 from public.lessons l
        where l.is_published and l.module_id = (
          select prev.id from public.modules prev
          where prev.course_id=m.course_id and prev.is_published and prev.position<m.position
          order by prev.position desc limit 1
        ) and not exists (
          select 1 from public.lesson_progress lp where lp.lesson_id=l.id and lp.user_id=auth.uid()
        )
      ))
  );
$$;
revoke all on function public.can_access_module(uuid) from public, anon;
grant execute on function public.can_access_module(uuid) to authenticated, service_role;

drop policy lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to authenticated
using ((is_published and public.can_access_module(module_id)) or public.is_staff());
drop policy quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes for select to authenticated
using ((is_published and public.can_access_module(module_id)) or public.is_staff());
drop policy projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
using ((is_published and public.can_access_module(module_id)) or public.is_staff());

-- Definer views intentionally expose ONLY preview columns. Explicit caller filters replace
-- base-table RLS here so locked titles remain visible without revealing lesson or project bodies.
create view public.lesson_outline with (security_barrier=true) as
select l.id,l.course_id,l.module_id,l.slug,l.title,l.summary,l.duration_minutes,l.position
from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=l.course_id
where l.is_published and m.is_published and c.is_published
and (public.is_enrolled(l.course_id) or public.is_staff());
create view public.quiz_outline with (security_barrier=true) as
select q.id,q.course_id,q.module_id,q.slug,q.title,q.description,q.pass_percent,q.max_attempts
from public.quizzes q join public.modules m on m.id=q.module_id join public.courses c on c.id=q.course_id
where q.is_published and m.is_published and c.is_published
and (public.is_enrolled(q.course_id) or public.is_staff());
create view public.project_outline with (security_barrier=true) as
select p.id,p.course_id,p.module_id,p.slug,p.title,p.summary,p.due_at,p.max_points
from public.projects p join public.modules m on m.id=p.module_id join public.courses c on c.id=p.course_id
where p.is_published and m.is_published and c.is_published
and (public.is_enrolled(p.course_id) or public.is_staff());
revoke all on public.lesson_outline,public.quiz_outline,public.project_outline from public,anon,authenticated;
grant select on public.lesson_outline,public.quiz_outline,public.project_outline to authenticated,service_role;

-- Resources must satisfy every attachment, including when an attachment was unpublished.
drop policy resources_select on public.resources;
create policy resources_select on public.resources for select to authenticated using (
 public.is_staff() or (public.is_enrolled(course_id)
 and (module_id is null or public.can_access_module(module_id))
 and (lesson_id is null or exists(select 1 from public.lessons l where l.id=lesson_id))
 and (project_id is null or exists(select 1 from public.projects p where p.id=project_id))
 and (live_session_id is null or exists(select 1 from public.live_sessions s where s.id=live_session_id))
 ));
drop policy submissions_update_own on public.submissions;
create policy submissions_update_own on public.submissions for update to authenticated
using (user_id=auth.uid() and status <> 'reviewed' and exists(select 1 from public.projects p where p.id=project_id))
with check (user_id=auth.uid() and status in ('in_progress','submitted') and exists(select 1 from public.projects p where p.id=project_id));

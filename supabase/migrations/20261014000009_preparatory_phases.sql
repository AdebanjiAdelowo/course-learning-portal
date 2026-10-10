-- Preparatory phases.
--
-- A phase can be marked as preparation for the course proper (Python foundations). The mark is
-- only used for presentation: preparatory modules are numbered on their own (P1, P2, ...) and the
-- core modules are numbered from 1, whatever comes before them. Positions, ids and slugs are
-- unchanged.

alter table public.phases add column is_preparatory boolean not null default false;

create or replace function public.public_course_outline(p_slug text) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'subtitle', c.subtitle,
    'description', c.description,
    'level', c.level,
    'duration_weeks', c.duration_weeks,
    'outcomes', to_jsonb(c.outcomes),
    'prerequisites', to_jsonb(c.prerequisites),
    'instructor', (
      select jsonb_build_object(
        'full_name', p.full_name, 'headline', p.headline, 'bio', p.bio,
        'avatar_url', p.avatar_url, 'links', p.links
      )
      from public.profiles p where p.id = c.instructor_id
    ),
    'phases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ph.id, 'slug', ph.slug, 'position', ph.position, 'title', ph.title,
        'description', ph.description, 'is_preparatory', ph.is_preparatory
      ) order by ph.position)
      from public.phases ph where ph.course_id = c.id
    ), '[]'::jsonb),
    'cohorts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', co.id, 'name', co.name, 'description', co.description,
        'starts_on', co.starts_on, 'ends_on', co.ends_on, 'status', co.status
      ) order by co.starts_on nulls last, co.name)
      from public.cohorts co
      where co.course_id = c.id and co.is_public and co.status <> 'completed'
    ), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', m.position,
        'phase_id', m.phase_id,
        'slug', m.slug,
        'title', m.title,
        'description', m.description,
        -- A module that is not published yet appears in the learning path by title and plan only.
        'is_published', m.is_published,
        'plan', m.plan,
        'lessons', case when m.is_published then coalesce((
          select jsonb_agg(jsonb_build_object('title', l.title, 'duration_minutes', l.duration_minutes)
                           order by l.position)
          from public.lessons l where l.module_id = m.id and l.is_published
        ), '[]'::jsonb) else '[]'::jsonb end,
        'quiz_count', case when m.is_published then
          (select count(*) from public.quizzes z where z.module_id = m.id and z.is_published) else 0 end,
        'problem_count', case when m.is_published then
          (select count(*) from public.coding_problems cp where cp.module_id = m.id and cp.is_published) else 0 end,
        'projects', case when m.is_published then coalesce((
          select jsonb_agg(pr.title order by pr.due_at nulls last, pr.title)
          from public.projects pr where pr.module_id = m.id and pr.is_published
        ), '[]'::jsonb) else '[]'::jsonb end
      ) order by m.position)
      from public.modules m where m.course_id = c.id
    ), '[]'::jsonb)
  )
  from public.courses c
  where c.slug = p_slug and c.is_published;
$$;

-- Learning path, practice limits, rate limiting and profile-link validation.
--
-- Additive only: no existing column, policy or row is removed.

-- ---------------------------------------------------------------------------
-- Planned modules: what a module will teach, before it is written
-- ---------------------------------------------------------------------------

-- JSON object written by the seed script or the instructor area:
--   { "objectives": ["..."],
--     "lessons": [{ "title": "...", "summary": "..." }],
--     "prerequisites": ["module-slug"],
--     "practice": ["..."] }
-- It describes intent, never content, so it is safe to show on the public website.
alter table public.modules
  add column plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object');

-- Students read published modules through `modules` (row-level security hides the rest).
-- This view adds the planned ones by title, description and plan only, so the portal can show
-- the whole learning path without revealing anything that is not ready.
create view public.module_path with (security_barrier = true) as
select m.id, m.course_id, m.phase_id, m.slug, m.title, m.description, m.position, m.is_published, m.plan
from public.modules m
join public.courses c on c.id = m.course_id
where c.is_published
  and (public.is_enrolled(m.course_id) or public.is_staff());
revoke all on public.module_path from public, anon, authenticated;
grant select on public.module_path to authenticated, service_role;

-- Swaps a module with its neighbour in course order. p_direction < 0 moves it earlier.
create function public.move_module(p_module_id uuid, p_direction integer) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_course uuid;
  v_position integer;
  v_other uuid;
  v_other_position integer;
begin
  if not public.is_staff() then
    raise exception 'Only instructors can edit modules.' using errcode = '42501';
  end if;

  select m.course_id, m.position into v_course, v_position
  from public.modules m where m.id = p_module_id;
  if v_course is null then return; end if;

  if p_direction < 0 then
    select m.id, m.position into v_other, v_other_position from public.modules m
    where m.course_id = v_course and m.position < v_position order by m.position desc limit 1;
  else
    select m.id, m.position into v_other, v_other_position from public.modules m
    where m.course_id = v_course and m.position > v_position order by m.position asc limit 1;
  end if;
  if v_other is null then return; end if;

  update public.modules set position = v_position + 1000000 where id = p_module_id;
  update public.modules set position = v_position where id = v_other;
  update public.modules set position = v_other_position where id = p_module_id;
end;
$$;
revoke all on function public.move_module(uuid, integer) from public, anon;
grant execute on function public.move_module(uuid, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profile links: https only, bounded, well formed
-- ---------------------------------------------------------------------------

create function public.valid_profile_links(p_links jsonb) returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_links) <> 'array' then false
    when jsonb_array_length(p_links) > 8 then false
    else not exists (
      select 1
      from jsonb_array_elements(p_links) as e(item)
      where jsonb_typeof(e.item) <> 'object'
        or jsonb_typeof(e.item -> 'label') is distinct from 'string'
        or jsonb_typeof(e.item -> 'url') is distinct from 'string'
        or char_length(e.item ->> 'label') not between 1 and 40
        or char_length(e.item ->> 'url') > 300
        or (e.item ->> 'url') !~ '^https://[^[:space:]<>"]+$'
    )
  end;
$$;

alter table public.profiles
  add constraint profiles_links_valid check (public.valid_profile_links(links)),
  -- "/photo.jpg" is a file shipped with the site; "//host" would be another website.
  add constraint profiles_avatar_not_protocol_relative check (avatar_url is null or avatar_url !~ '^//');

-- ---------------------------------------------------------------------------
-- Practice submissions: limits enforced in the database, whatever the client does
-- ---------------------------------------------------------------------------

-- A student may keep one draft per problem and add submitted attempts to their history. This
-- trigger bounds that history and refuses an attempt identical to the previous one. Requests
-- without a signed-in user (the seed script, a future grading service) are not limited.
create function public.code_submissions_guard() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
begin
  if (select auth.uid()) is null then return new; end if;
  if new.status <> 'submitted' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'submitted' then return new; end if;
    -- A draft turned into an attempt is dated when it is submitted, not when it was started.
    new.created_at := now();
  end if;

  if (
    select count(*) from public.code_submissions s
    where s.user_id = new.user_id and s.status = 'submitted' and s.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'practice_limit_hour' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.code_submissions s
    where s.user_id = new.user_id and s.problem_id = new.problem_id and s.status = 'submitted'
  ) >= 30 then
    raise exception 'practice_limit_problem' using errcode = 'P0001';
  end if;

  select s.code into v_previous from public.code_submissions s
  where s.user_id = new.user_id and s.problem_id = new.problem_id and s.status = 'submitted'
  order by s.created_at desc limit 1;
  if v_previous is not null and v_previous = new.code then
    raise exception 'practice_duplicate' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
revoke all on function public.code_submissions_guard() from public, anon, authenticated;

create trigger code_submissions_guard before insert or update on public.code_submissions
  for each row execute function public.code_submissions_guard();

-- ---------------------------------------------------------------------------
-- Rate limiting for public forms
-- ---------------------------------------------------------------------------

-- One row per accepted request. Keys are SHA-256 hashes computed by the server, so no address
-- or email is stored here. Only the service role can read or write the table.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) between 1 and 60),
  key_hash text not null check (char_length(key_hash) between 1 and 128),
  created_at timestamptz not null default now()
);
create index rate_limit_hits_lookup_idx on public.rate_limit_hits (bucket, key_hash, created_at desc);
alter table public.rate_limit_hits enable row level security;
grant all on public.rate_limit_hits to service_role;
grant usage on sequence public.rate_limit_hits_id_seq to service_role;

-- Records a request and returns true, or returns false when p_limit requests with this key
-- were already accepted in the last p_window_seconds. The advisory lock makes the check and
-- the insert atomic per key, so parallel requests cannot slip past the limit together.
create function public.take_rate_limit(p_bucket text, p_key_hash text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));
  delete from public.rate_limit_hits h where h.created_at < now() - interval '2 days';

  select count(*) into v_count from public.rate_limit_hits h
  where h.bucket = p_bucket and h.key_hash = p_key_hash
    and h.created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then return false; end if;

  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  return true;
end;
$$;
revoke all on function public.take_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Public outline: each module now carries its phase and, when planned, its plan
-- ---------------------------------------------------------------------------

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
        'id', ph.id, 'slug', ph.slug, 'position', ph.position, 'title', ph.title, 'description', ph.description
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

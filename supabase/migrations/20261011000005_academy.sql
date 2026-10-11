-- Teaching-academy structure: phases, cohorts, enrolment requests, instructor profile details
-- and coding problems.
--
-- Course material (phases, modules, lessons, quizzes, projects, coding problems) belongs to the
-- course and is shared by every cohort. A cohort only carries what differs between runs of the
-- course: its dates, its students, and optionally its own live sessions and announcements.

-- ---------------------------------------------------------------------------
-- Phases: course -> phases -> modules -> lessons
-- ---------------------------------------------------------------------------

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, position),
  unique (id, course_id)
);

alter table public.modules add column phase_id uuid;
alter table public.modules
  add constraint modules_phase_fkey foreign key (phase_id, course_id)
  references public.phases (id, course_id) on delete set null (phase_id);
create index modules_phase_id_idx on public.modules (phase_id);

-- ---------------------------------------------------------------------------
-- Instructor profile details shown on the public site
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column headline text check (headline is null or char_length(headline) <= 160),
  add column avatar_url text check (avatar_url is null or (avatar_url ~ '^(https://|/)' and char_length(avatar_url) <= 500)),
  -- JSON array of {"label": "GitHub", "url": "https://..."}.
  add column links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array');

grant update (headline, avatar_url, links) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Cohorts
-- ---------------------------------------------------------------------------

create type public.cohort_status as enum ('planned', 'open', 'waitlist', 'running', 'completed');
create type public.enrolment_request_kind as enum ('enrolment', 'waitlist');
create type public.enrolment_request_status as enum ('new', 'contacted', 'enrolled', 'declined');

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 600),
  starts_on date,
  ends_on date,
  capacity integer check (capacity is null or capacity > 0),
  status public.cohort_status not null default 'planned',
  -- Whether the cohort is listed on the public website.
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (id, course_id),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

alter table public.enrollments add column cohort_id uuid references public.cohorts (id) on delete set null;
create index enrollments_cohort_id_idx on public.enrollments (cohort_id);

-- A live session or announcement with no cohort is for everyone on the course.
alter table public.live_sessions add column cohort_id uuid references public.cohorts (id) on delete cascade;
alter table public.announcements add column cohort_id uuid references public.cohorts (id) on delete cascade;

create function public.in_cohort(p_cohort_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid())
      and e.cohort_id = p_cohort_id
      and e.status in ('active', 'completed')
  );
$$;
revoke all on function public.in_cohort(uuid) from public, anon;
grant execute on function public.in_cohort(uuid) to authenticated, service_role;

drop policy live_sessions_select on public.live_sessions;
create policy live_sessions_select on public.live_sessions for select to authenticated
  using (
    (select public.is_staff())
    or (public.is_enrolled(course_id) and (cohort_id is null or public.in_cohort(cohort_id)))
  );

drop policy announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (
    (select public.is_staff())
    or (
      published_at <= now()
      and public.is_enrolled(course_id)
      and (cohort_id is null or public.in_cohort(cohort_id))
    )
  );

-- Requests from the public website. Written by the server (service role), read by staff.
create table public.enrolment_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  cohort_id uuid references public.cohorts (id) on delete set null,
  kind public.enrolment_request_kind not null default 'enrolment',
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text not null default '' check (char_length(message) <= 2000),
  status public.enrolment_request_status not null default 'new',
  created_at timestamptz not null default now()
);
create index enrolment_requests_course_idx on public.enrolment_requests (course_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Coding problems
-- ---------------------------------------------------------------------------

create type public.problem_difficulty as enum ('warm_up', 'core', 'challenge');
create type public.code_submission_status as enum ('draft', 'submitted');
-- 'not_evaluated' until an isolated execution service exists. Nothing in this application or
-- in the database ever runs student code.
create type public.code_verdict as enum ('not_evaluated', 'passed', 'failed', 'error');

create table public.coding_problems (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  difficulty public.problem_difficulty not null default 'core',
  position integer not null check (position > 0),
  statement_md text not null default '',
  constraints text[] not null default '{}',
  -- JSON array of {"input": "...", "output": "...", "explanation": "..."}.
  examples jsonb not null default '[]'::jsonb check (jsonb_typeof(examples) = 'array'),
  starter_code text not null default '',
  hints text[] not null default '{}',
  is_published boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', summary), 'B')
    || setweight(to_tsvector('english', statement_md), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade,
  unique (course_id, slug),
  unique (module_id, position)
);
create index coding_problems_module_idx on public.coding_problems (module_id);
create index coding_problems_search_idx on public.coding_problems using gin (search);
create trigger coding_problems_set_updated_at before update on public.coding_problems
  for each row execute function public.set_updated_at();

-- Editorial, reference solution and hidden tests are kept apart so that row-level security can
-- hide them. Students obtain the editorial through problem_editorial() once they have submitted.
create table public.coding_problem_solutions (
  problem_id uuid primary key references public.coding_problems (id) on delete cascade,
  editorial_md text not null default '',
  reference_solution text not null default '',
  -- JSON array of {"input": "...", "output": "..."} for the future execution service.
  hidden_tests jsonb not null default '[]'::jsonb check (jsonb_typeof(hidden_tests) = 'array')
);

create table public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.coding_problems (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null default 'python' check (language = 'python'),
  code text not null check (char_length(code) between 1 and 20000),
  status public.code_submission_status not null default 'draft',
  verdict public.code_verdict not null default 'not_evaluated',
  results jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index code_submissions_user_idx on public.code_submissions (user_id, problem_id, created_at desc);
-- One working draft per student and problem; submitted attempts accumulate as history.
create unique index code_submissions_one_draft_idx on public.code_submissions (problem_id, user_id) where status = 'draft';
create trigger code_submissions_set_updated_at before update on public.code_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges and row-level security for the new tables
-- ---------------------------------------------------------------------------

grant all on public.phases, public.cohorts, public.enrolment_requests, public.coding_problems,
  public.coding_problem_solutions, public.code_submissions to service_role;

grant select on public.phases, public.cohorts, public.enrolment_requests, public.coding_problems,
  public.coding_problem_solutions, public.code_submissions to authenticated;
grant insert, update, delete on public.phases, public.cohorts, public.coding_problems,
  public.coding_problem_solutions to authenticated;
grant update (status), delete on public.enrolment_requests to authenticated;
-- A student may write the code and whether it is a draft. Verdict and results are reserved for
-- the service role, so a student can never mark their own work as passed.
grant insert (problem_id, user_id, code, status) on public.code_submissions to authenticated;
grant update (code, status) on public.code_submissions to authenticated;
grant delete on public.code_submissions to authenticated;

alter table public.phases enable row level security;
alter table public.cohorts enable row level security;
alter table public.enrolment_requests enable row level security;
alter table public.coding_problems enable row level security;
alter table public.coding_problem_solutions enable row level security;
alter table public.code_submissions enable row level security;

create policy phases_select on public.phases for select to authenticated
  using (public.is_enrolled(course_id) or (select public.is_staff()));
create policy phases_staff_write on public.phases for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- A student sees the cohort they belong to; staff see all.
create policy cohorts_select on public.cohorts for select to authenticated
  using ((select public.is_staff()) or public.in_cohort(id));
create policy cohorts_staff_write on public.cohorts for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy enrolment_requests_staff_select on public.enrolment_requests for select to authenticated
  using ((select public.is_staff()));
create policy enrolment_requests_staff_update on public.enrolment_requests for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy enrolment_requests_staff_delete on public.enrolment_requests for delete to authenticated
  using ((select public.is_staff()));

create policy coding_problems_select on public.coding_problems for select to authenticated
  using ((is_published and public.can_access_module(module_id)) or (select public.is_staff()));
create policy coding_problems_staff_write on public.coding_problems for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy coding_problem_solutions_staff_only on public.coding_problem_solutions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy code_submissions_select on public.code_submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy code_submissions_insert_own on public.code_submissions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.coding_problems p where p.id = problem_id)
  );
-- Only a draft can be edited; submitting it freezes it.
create policy code_submissions_update_own on public.code_submissions for update to authenticated
  using (user_id = (select auth.uid()) and status = 'draft')
  with check (user_id = (select auth.uid()));
create policy code_submissions_delete_own_draft on public.code_submissions for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- Titles of every published problem for the learning path, including those in locked modules.
create view public.coding_problem_outline with (security_barrier = true) as
select p.id, p.course_id, p.module_id, p.slug, p.title, p.summary, p.difficulty, p.position
from public.coding_problems p
join public.modules m on m.id = p.module_id
join public.courses c on c.id = p.course_id
where p.is_published and m.is_published and c.is_published
  and (public.is_enrolled(p.course_id) or public.is_staff());
revoke all on public.coding_problem_outline from public, anon, authenticated;
grant select on public.coding_problem_outline to authenticated, service_role;

-- The editorial and reference solution, released once the caller has submitted an attempt.
create function public.problem_editorial(p_problem_id uuid)
returns table (editorial_md text, reference_solution text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.editorial_md, s.reference_solution
  from public.coding_problem_solutions s
  where s.problem_id = p_problem_id
    and (
      public.is_staff()
      or exists (
        select 1 from public.code_submissions cs
        where cs.problem_id = p_problem_id
          and cs.user_id = (select auth.uid())
          and cs.status = 'submitted'
      )
    );
$$;
revoke all on function public.problem_editorial(uuid) from public, anon;
grant execute on function public.problem_editorial(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Search now covers coding problems
-- ---------------------------------------------------------------------------

create or replace function public.search_course(p_course_id uuid, p_query text, p_limit integer default 24)
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
    select 'problem', cp.id, cp.slug, cp.title, cp.summary, m.title, null,
           ts_rank(cp.search, q.tsq) + case when cp.title ilike q.pattern then 1 else 0 end
    from public.coding_problems cp
    join public.modules m on m.id = cp.module_id
    cross join q
    where cp.course_id = p_course_id and cp.is_published
      and (cp.search @@ q.tsq or cp.title ilike q.pattern)
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

-- ---------------------------------------------------------------------------
-- Public outline: phases, the whole learning path (planned modules by title only), cohorts
-- that are open to the public, and the instructor's public profile.
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
        'id', ph.id, 'position', ph.position, 'title', ph.title, 'description', ph.description
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
        'title', m.title,
        'description', m.description,
        -- A module that is not published yet appears in the learning path by title only.
        'is_published', m.is_published,
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

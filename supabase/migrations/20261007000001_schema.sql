-- Core relational schema for the learning portal.
-- Access control (grants, row-level security, helper functions) lives in the next migration.

create type public.user_role as enum ('student', 'instructor', 'admin');
create type public.enrollment_status as enum ('active', 'paused', 'completed', 'withdrawn');
create type public.question_type as enum ('multiple_choice', 'multiple_select', 'true_false', 'short_answer');
-- "Not started" is represented by the absence of a submission row.
create type public.submission_status as enum ('in_progress', 'submitted', 'reviewed');
create type public.resource_kind as enum ('pdf', 'notebook', 'dataset', 'code', 'video', 'slides', 'reading', 'link');
create type public.feedback_kind as enum ('project', 'quiz', 'general');

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role public.user_role not null default 'student',
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  bio text check (bio is null or char_length(bio) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every auth user gets a profile. The role is never taken from user-editable metadata.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Course structure: course -> modules -> lessons
-- ---------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  subtitle text,
  description text not null default '',
  level text,
  duration_weeks integer check (duration_weeks is null or duration_weeks > 0),
  outcomes text[] not null default '{}',
  prerequisites text[] not null default '{}',
  instructor_id uuid references public.profiles (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index enrollments_course_id_idx on public.enrollments (course_id);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  position integer not null check (position > 0),
  -- A module opens once this date has passed (null: no date gate) ...
  available_from timestamptz,
  -- ... and, when true, once every lesson of the previous module is complete.
  requires_previous boolean not null default true,
  is_published boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', description), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, position),
  -- Lets child tables carry a (module_id, course_id) foreign key so the two can never disagree.
  unique (id, course_id)
);

create index modules_search_idx on public.modules using gin (search);
create trigger modules_set_updated_at before update on public.modules
  for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  objectives text[] not null default '{}',
  body_md text not null default '',
  video_url text check (video_url is null or video_url ~ '^https://'),
  duration_minutes integer not null default 10 check (duration_minutes > 0),
  position integer not null check (position > 0),
  is_published boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', summary), 'B')
    || setweight(to_tsvector('english', body_md), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade,
  unique (course_id, slug),
  unique (module_id, position)
);

create index lessons_course_id_idx on public.lessons (course_id);
create index lessons_search_idx on public.lessons using gin (search);
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  pass_percent integer not null default 70 check (pass_percent between 0 and 100),
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade,
  unique (course_id, slug)
);

create index quizzes_module_id_idx on public.quizzes (module_id);
create trigger quizzes_set_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();

-- What a student sees while taking a quiz. `options` is a JSON array of {"id": "a", "text": "..."}.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null check (position > 0),
  type public.question_type not null,
  prompt_md text not null,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  points integer not null default 1 check (points > 0),
  unique (quiz_id, position)
);

-- Answer keys are kept apart from questions so that row-level security can hide them from
-- students entirely. Shape of `correct` by question type:
--   multiple_choice: "a"            (option id)
--   multiple_select: ["a", "c"]     (option ids)
--   true_false:      true | false
--   short_answer:    ["accepted", "answers"]  (compared case- and whitespace-insensitively)
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct jsonb not null,
  explanation_md text not null default ''
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  -- Per-question grading snapshot (including explanations), written by the server at submission.
  results jsonb not null default '[]'::jsonb,
  score numeric(8, 2) not null check (score >= 0),
  max_score numeric(8, 2) not null check (max_score > 0),
  percent numeric(5, 2) not null check (percent between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  unique (quiz_id, user_id, attempt_number),
  check (score <= max_score)
);

create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Projects and submissions
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  description_md text not null default '',
  objectives text[] not null default '{}',
  requirements text[] not null default '{}',
  submission_instructions_md text not null default '',
  -- JSON array of {"criterion": "...", "description": "...", "points": 10}.
  rubric jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  max_points integer not null default 100 check (max_points > 0),
  due_at timestamptz,
  is_published boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', summary), 'B')
    || setweight(to_tsvector('english', description_md), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete cascade,
  unique (course_id, slug)
);

create index projects_module_id_idx on public.projects (module_id);
create index projects_search_idx on public.projects using gin (search);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.submission_status not null default 'in_progress',
  work_url text check (work_url is null or (work_url ~ '^https://' and char_length(work_url) <= 500)),
  notes text not null default '' check (char_length(notes) <= 5000),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id),
  -- A submitted or reviewed piece of work must point at something.
  check (status = 'in_progress' or work_url is not null)
);

create index submissions_user_id_idx on public.submissions (user_id);
create index submissions_status_idx on public.submissions (status);

-- Timestamps follow the status. Students cannot write these columns at all (see the column
-- grants in the next migration); the service role may supply explicit values, for example when
-- importing historical work, and they are kept.
create function public.submissions_track_status() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.status = 'in_progress' then
      new.submitted_at := null;
      new.reviewed_at := null;
    else
      new.submitted_at := coalesce(new.submitted_at, now());
      new.reviewed_at := case when new.status = 'reviewed' then coalesce(new.reviewed_at, now()) else null end;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'in_progress' then
      new.submitted_at := null;
      new.reviewed_at := null;
    elsif new.status = 'submitted' then
      if new.submitted_at is not distinct from old.submitted_at then
        new.submitted_at := now();
      end if;
      new.reviewed_at := null;
    else
      new.submitted_at := coalesce(new.submitted_at, now());
      if new.reviewed_at is not distinct from old.reviewed_at then
        new.reviewed_at := now();
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger submissions_track_status before insert or update on public.submissions
  for each row execute function public.submissions_track_status();

-- ---------------------------------------------------------------------------
-- Live sessions, resources, announcements
-- ---------------------------------------------------------------------------

-- Status (upcoming / live / completed) is derived from starts_at and ends_at, never stored,
-- so it cannot drift out of date.
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- IANA zone the session is scheduled in; shown next to the student's local time.
  timezone text not null default 'UTC',
  instructor_name text not null,
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  recording_url text check (recording_url is null or recording_url ~ '^https://'),
  slides_url text check (slides_url is null or slides_url ~ '^(https://|/)'),
  notes_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, course_id) references public.modules (id, course_id) on delete set null (module_id),
  check (ends_at > starts_at)
);

create index live_sessions_course_starts_idx on public.live_sessions (course_id, starts_at);
create trigger live_sessions_set_updated_at before update on public.live_sessions
  for each row execute function public.set_updated_at();

-- A resource belongs to a course and may be attached to a module, lesson, project or session.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid references public.modules (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  live_session_id uuid references public.live_sessions (id) on delete cascade,
  title text not null,
  description text not null default '',
  kind public.resource_kind not null default 'link',
  -- Absolute https URL, or a site-relative path for files shipped in /public.
  url text not null check (url ~ '^(https://|/)'),
  position integer not null default 1,
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', description), 'B')
  ) stored,
  created_at timestamptz not null default now()
);

create index resources_course_id_idx on public.resources (course_id);
create index resources_lesson_id_idx on public.resources (lesson_id);
create index resources_project_id_idx on public.resources (project_id);
create index resources_live_session_id_idx on public.resources (live_session_id);
create index resources_search_idx on public.resources using gin (search);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body_md text not null default '',
  pinned boolean not null default false,
  published_at timestamptz not null default now()
);

create index announcements_course_published_idx on public.announcements (course_id, published_at desc);

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind public.feedback_kind not null,
  project_id uuid references public.projects (id) on delete cascade,
  submission_id uuid references public.submissions (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete cascade,
  title text not null,
  body_md text not null,
  score numeric(8, 2) check (score is null or score >= 0),
  max_score numeric(8, 2) check (max_score is null or max_score > 0),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (kind = 'project' and project_id is not null and quiz_id is null)
    or (kind = 'quiz' and quiz_id is not null and project_id is null and submission_id is null)
    or (kind = 'general' and project_id is null and quiz_id is null and submission_id is null)
  ),
  check ((score is null) = (max_score is null)),
  check (score is null or score <= max_score)
);

create index feedback_student_idx on public.feedback (student_id, created_at desc);
create index feedback_submission_idx on public.feedback (submission_id);

-- ---------------------------------------------------------------------------
-- Public contact form
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null default 'general',
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

# Course Learning Portal

A learning-management portal for cohort-based technical courses. Enrolled students sign in and work through a structured curriculum of lessons, quizzes and projects, attend live sessions, and receive instructor feedback. A public website presents the course, and an instructor area covers student progress, reviews and content editing.

It is built for scientific and technical teaching: lessons are written in Markdown with LaTeX mathematics, syntax-highlighted code, tables, figures, video embeds and downloadable notebooks, datasets and PDFs.

The repository ships with a complete demo course, "Foundations of Scientific Machine Learning" (4 modules, 13 lessons, 4 quizzes, 4 projects), so the whole platform can be tried immediately and then replaced with real content.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Local installation](#local-installation)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Authentication](#authentication)
- [Progress and unlocking rules](#progress-and-unlocking-rules)
- [Development](#development)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Authoring course content](#authoring-course-content)
- [Managing students and instructors](#managing-students-and-instructors)
- [Rebranding](#rebranding)
- [Limitations](#limitations)
- [Possible extensions](#possible-extensions)

## Features

**Public website**

- Landing page with course overview, curriculum preview, instructor section and FAQ
- Contact and help page with a validated form
- Student login

**Learner portal** (`/learn`, sign-in required)

- Dashboard that answers "what should I work on next?": next step, current module, overall completion, upcoming live session, projects due, recent and unread feedback, quiz performance, completed lessons and announcements
- Curriculum with modules, lessons, quizzes and projects, showing completed, current, upcoming and locked material
- Lesson pages with objectives, Markdown and LaTeX content, code with copy buttons, figures, video embeds, resources, previous and next navigation, and a collapsible curriculum sidebar (a drawer on small screens)
- Quizzes with multiple choice, multiple select, true/false and short answer questions, a question counter, server-side grading, a pass mark, explanations after submission, retakes and attempt history
- Projects with brief, objectives, requirements, rubric, deadline, starter resources, draft saving and submission
- Live sessions with status derived from the clock (upcoming, live, completed), shown in the student's time zone, with recordings, slides, notes and resources for past sessions
- Resource library, feedback inbox with read and unread state, a progress page, full-text search, and profile settings
- Light and dark themes

**Instructor area** (`/admin`, instructor or admin role required)

- Student account creation and course enrolment management, including pausing and restoring access
- Cohort overview with per-student completion
- Submission queue, review form with score and written feedback
- General feedback to individual students
- Lesson, quiz and project editors with drafts and publishing, module creation, and lesson and question reordering
- Resource management: links and files attached to the course, a module, a lesson, a project or a live session
- Live session scheduling and announcements

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19 server components and server actions) |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS 4 with semantic design tokens in `src/app/globals.css` |
| Database | PostgreSQL via Supabase, with row-level security |
| Authentication | Supabase Auth (email and password), cookie sessions through `@supabase/ssr` |
| Validation | Zod |
| Content rendering | `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex` (KaTeX), `rehype-highlight` |
| Tests | Vitest (unit and database integration), Playwright (end to end) |

## Architecture

```text
Browser
   |
   v
src/proxy.ts ............ refreshes the session cookie, redirects visitors without a
   |                      session away from /learn/* and /admin/* to /learn/login
   v
Server components ....... read data with the signed-in user's own session
Server actions .......... validate input with Zod, then write
   |
   v
Supabase (PostgreSQL) ... row-level security decides what each user can read and write
```

Design decisions worth knowing before changing the code:

- **Authorisation is enforced in the database.** Every table has row-level security. The application layer checks permissions as well, but a student cannot read another student's progress, attempts, submissions or feedback even by calling the API directly. `tests/integration/access-control.test.ts` verifies this with real sessions.
- **Quiz answers never reach the browser before submission.** Answer keys live in `question_keys`, a table students cannot read. Students also have no insert privilege on `quiz_attempts`. Grading happens in a server action (`src/app/learn/actions/quiz.ts`) that authorises the caller, reads the keys with the service role, grades with a pure function, and stores the attempt.
- **Rules live in pure functions.** Completion, unlocking, "next step", quiz grading and session status are plain TypeScript in `src/lib/domain`, with no database or clock access, and are covered by unit tests. The student dashboard and the instructor overview call the same function, so they cannot disagree.
- **No client-side data fetching.** Pages are server-rendered per request from the user's session. Client components are limited to interaction: the quiz runner, forms, drawers, the theme toggle and the sidebar toggle.
- **The service-role key is used in three places only:** quiz grading, the public contact form, and the seed script. Everything else runs with the user's own privileges.
- **Lesson content is stored as Markdown in the database** and rendered on the server. Raw HTML in the source is not rendered, so stored content cannot inject markup or scripts.

## Repository structure

```text
supabase/
  config.toml                  local stack and auth settings
  migrations/                  schema, grants, row-level security, database functions
  templates/                   password-reset and invitation emails
seed/
  course.ts                    the demo course: modules, quizzes, projects, sessions
  lessons/*.md                 lesson bodies
  types.ts                     shape of a course definition
scripts/seed.ts                loads seed/ into the database
src/
  proxy.ts                     session refresh and route protection
  config/site.ts               brand name, support email, navigation
  app/
    (site)/                    public website: landing page, contact
    learn/(auth)/              login, forgot password
    learn/(portal)/            dashboard, curriculum, lessons, quizzes, projects, ...
    learn/actions/             server actions used by the portal
    admin/                     instructor area
    auth/                      email-link confirmation and sign-out routes
  components/                  shared UI
  lib/
    domain/                    progress, quiz grading, session status, editor parsing (pure, unit tested)
    data/                      server-side queries
    supabase/                  clients, session handling, generated database types
    validation.ts              Zod schemas for every form
public/
  figures/, resources/         lesson figures and downloadable files
tests/
  unit/, integration/, e2e/
```

## Local installation

Requirements: Node.js 22 or newer, and Docker (for the local Supabase stack).

```bash
npm install

# 1. Start PostgreSQL, Auth and the API locally. Migrations are applied automatically.
#    The command prints the API URL and keys.
npm run db:start

# 2. Configure the app.
cp .env.example .env.local
#    Fill in NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from the output of
#    step 1 (npm run db:status prints them again), and choose a SEED_DEMO_PASSWORD.

# 3. Load the demo course and demo accounts.
npm run seed

# 4. Run the app.
npm run dev
```

Open <http://localhost:3000>. The seed script creates three accounts, all with the password you set in `SEED_DEMO_PASSWORD`:

| Email | Role | State |
| --- | --- | --- |
| `student@example.com` | Student | Module 1 finished, part-way through Module 2, with feedback |
| `student2@example.com` | Student | Just starting, one project awaiting review |
| `instructor@example.com` | Instructor | Access to `/admin` |

Emails sent by the local stack (password resets) are captured at <http://127.0.0.1:54324>. Supabase Studio, a database browser, runs at <http://127.0.0.1:54323>.

## Environment variables

Defined in `.env.local`, which is ignored by git. `.env.example` documents each one.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key, or the newer publishable key |
| `NEXT_PUBLIC_SITE_URL` | Public | Origin of the app, used in password-reset links |
| `NEXT_PUBLIC_COURSE_SLUG` | Public | Course presented on the public website |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service-role or secret key. Bypasses row-level security. Never expose it to the browser |
| `SEED_DEMO_PASSWORD` | Local only | Password for the demo accounts (at least 10 characters) |

## Database

The schema is defined entirely by the SQL files in `supabase/migrations`. Nothing needs to be configured by hand.

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user: name, role (`student`, `instructor`, `admin`), time zone |
| `courses`, `modules`, `lessons` | The curriculum hierarchy |
| `enrollments` | Which user takes which course |
| `lesson_progress` | One row per completed lesson per user |
| `quizzes`, `questions` | Quizzes and what a student sees of each question |
| `question_keys` | Correct answers and explanations, readable by staff only |
| `quiz_attempts` | Graded attempts, including a snapshot of the questions as answered |
| `projects`, `submissions` | Assignments and each student's work (`in_progress`, `submitted`, `reviewed`) |
| `feedback` | Instructor comments on a project, a quiz or general performance, with optional score and read state |
| `live_sessions` | Scheduled sessions with meeting link, recording, slides and notes |
| `resources` | Files and links attached to a course, module, lesson, project or session |
| `announcements` | Course-wide notices |
| `contact_messages` | Messages from the public contact form |

"Not started" for a project is the absence of a submission row. Feedback references the submission it reviews, so a project can receive several rounds of feedback.

**Integrity.** Foreign keys cascade from course to its content. Lessons, quizzes and projects carry a composite foreign key `(module_id, course_id)`, so an item can never point at a module from another course. Check constraints cover slugs, score ranges, https-only links, and consistency between a feedback row's kind and what it is attached to.

**Access control** (`20261007000002_access_control.sql`):

- Anonymous visitors have no table privileges. The public website reads a single function, `public_course_outline`, which returns titles and descriptions only.
- Students read published material for courses they are enrolled in, and only their own progress, attempts, submissions and feedback.
- Column-level grants stop a student from changing their role or email, or a submission's owner or timestamps.
- A student cannot edit a submission after review, and cannot mark one as reviewed.
- Instructors and admins can read and manage everything.

**Functions.** `search_course` performs full-text search over lessons, modules, projects and resources and runs with the caller's privileges. `mark_feedback_read` lets a student mark their own feedback as read without update rights on the table. `save_quiz_question` writes a question and its answer key in one transaction, and `move_quiz_question` and `move_lesson` swap an item with its neighbour; all three are restricted to instructors.

### Migrations

```bash
npm run db:reset                           # rebuild the local database from the migrations
npx supabase migration new add_something   # create a new, timestamped migration file
npm run db:types                           # regenerate src/lib/supabase/database.types.ts
```

After `db:reset` the database is empty, so run `npm run seed` again. Regenerate the types whenever the schema changes; the application is typed against them.

### Seeding

```bash
npm run seed            # course content, demo accounts and demo activity (local stack only)
npm run seed:content    # course content only
```

Content is upserted by slug, so re-running either command updates lessons, quizzes and projects in place and never deletes student progress, attempts or submissions. `npm run seed` refuses to create demo accounts on a remote project unless `--allow-remote` is passed.

## Authentication

- Students sign in with email and password. There is no public sign-up: accounts are issued by the course team (`enable_signup = false` in `supabase/config.toml`).
- Sessions are stored in Supabase SSR cookies and refreshed on every request by `src/proxy.ts`.
- Requests to `/learn/*` and `/admin/*` without a session are redirected to `/learn/login`, and the visitor is returned to the page they asked for after signing in. Only same-site paths are accepted as a return target.
- Every protected page, layout and server action also verifies the session itself (`requireViewer`, `requireStaff`), so the proxy is not the only gate.
- **Password reset:** `/learn/forgot-password` sends an email containing a one-time link to `/auth/confirm`, which verifies the token, creates a session and forwards to `/learn/update-password`. The form gives the same answer whether or not the address is registered. Links are single use and expire after one hour.
- Sign-out is a POST to `/auth/signout`.
- The minimum password length is 10 characters, set in `supabase/config.toml` and in `src/lib/validation.ts`.

## Progress and unlocking rules

Implemented in `src/lib/domain/progress.ts` and described to students on the Progress page.

A course consists of required items: every published lesson, quiz and project. Each counts once, with equal weight.

| Item | Counts as done when |
| --- | --- |
| Lesson | The student marks it complete |
| Quiz | The student's best attempt reaches the pass mark |
| Project | The work is submitted or reviewed (a saved draft does not count) |

```text
completion % = floor(100 * items done / required items)
```

The value is rounded down, so 100% appears only when every item is done. Module completion applies the same formula to one module.

A module is locked while its `available_from` date is in the future, or while it has `requires_previous` set and the previous module still has incomplete lessons. Quizzes and projects never block the next module. Instructors preview the course with nothing locked.

Database policies enforce the same rules for lesson and project bodies, quiz questions, progress writes, submissions and attached resources. The `lesson_outline`, `quiz_outline` and `project_outline` views expose only preview metadata for published courses with an active enrolment, so locked titles remain visible in the curriculum. Staff can preview protected content. Search cannot return locked lesson bodies or project bodies. Static demo downloads in `public/resources` are public assets; confidential files need authenticated storage or a protected download route.

## Development

```bash
npm run dev          # development server
npm run lint         # ESLint
npm run typecheck    # TypeScript, strict
npm run test         # unit tests
npm run check        # lint, type check and unit tests together
npm run build        # production build
npm run db:start     # start the local Supabase stack
npm run db:stop      # stop it (data is kept)
npm run db:status    # print local URLs and keys
```

## Testing

| Suite | Command | Needs | Covers |
| --- | --- | --- | --- |
| Unit | `npm run test` | Nothing | Completion formula, unlocking, next step, quiz grading for every question type, session status, time-zone conversion, redirect safety, video embed allow-list, form validation, question and rubric parsing for the editors |
| Integration | `npm run test:integration` | Running, seeded local stack | Row-level security through the real API: cross-student isolation, hidden answer keys, forged attempts, role escalation, reviewed submissions, unpublished content, search, constraints, and the question-saving and reordering functions |
| End to end | `npm run test:e2e` | Running, seeded local stack | Route protection, sign-in and sign-out, password-reset handling, lesson rendering, completion that persists across reloads and sign-out, module unlocking, a full quiz attempt, project submission, search, mobile drawers, the instructor area, the public site, and the quiz, project and resource editors together with what a student then sees |

The end-to-end suite needs a browser. Either install the bundled one or use an installed Chrome:

```bash
npx playwright install chromium
npm run test:e2e

# or
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

The integration and end-to-end suites add a few rows for the second demo student (quiz attempts, a contact message). Run `npm run seed` to restore the demo state.

## Production deployment

The app is a standard Next.js application and needs a Node.js host (for example Vercel, or any platform that runs `next start`) plus a hosted Supabase project.

1. **Create a Supabase project**, then apply the schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

2. **Configure authentication** in the Supabase dashboard, under Authentication:
   - Set the Site URL to your production origin, and add `https://your-domain/auth/confirm` to the redirect URLs.
   - Disable new user sign-ups.
   - Replace the "Reset password" and "Invite user" email templates with the files in `supabase/templates`. They link to `/auth/confirm` with a token hash, which is what the app expects.
   - Configure custom SMTP. The built-in email service is rate limited and intended for testing.

3. **Set the environment variables** on your host, using the production values of everything in `.env.example` except `SEED_DEMO_PASSWORD`. `NEXT_PUBLIC_SITE_URL` must be the production origin.

4. **Load your course:**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
   npm run seed:content
   ```

5. **Create accounts** for your instructor and students (see [Managing students and instructors](#managing-students-and-instructors)).

6. **Build and start:** `npm run build`, then `npm run start`, or let your platform do so.

Files in `public/resources` are served to anyone who knows the URL. Keep material that must stay private in a storage service with access control and link to it from a resource.

## Authoring course content

There are two ways to author a course, and they write to the same tables.

**In the browser**, at `/admin/content`. Instructors create and edit lessons, quizzes with their questions, and projects with their rubrics, reorder lessons and questions, and manage resources at `/admin/content/resources`. New quizzes start as drafts and can be published once they have a question. See [Editing in the browser](#editing-in-the-browser).

**In files**, as described in the rest of this section. Course structure lives in `seed/course.ts` and lesson bodies in `seed/lessons/*.md`. Edit them, then run `npm run seed:content`. The types in `seed/types.ts` describe every field, and TypeScript reports mistakes before anything is written.

Choose one as the source of truth for each course. `seed:content` overwrites lessons, quizzes (including all their questions), projects and course resources with what the files say, so running it after editing in the browser discards the browser edits to anything the files also define.

### Editing in the browser

- **Lessons.** Markdown body, objectives, duration, optional video, and a Published switch. Use the arrows on the content page to reorder lessons within a module.
- **Quizzes.** Title, module, pass mark, optional attempt limit. Each question has a type, a prompt, points, an explanation, and its answer:
  - multiple choice and multiple select: one option per line, with an asterisk at the start of each correct line, for example `* Central difference`;
  - true or false: pick the correct value;
  - short answer: accepted answers, one per line.
- **Projects.** Brief, objectives and requirements (one per line), deadline in the instructor's time zone, and a rubric written one criterion per line as `Criterion | what you look for | points`. The maximum score is the sum of the points.
- **Resources.** An https link, or the path of a file in `public/` such as `/resources/notes.pdf`, attached to the whole course or to one module, lesson, project or live session.

Quizzes and projects cannot be deleted from the browser, because that would also delete every student's attempts or submissions. Unpublish them instead. Editing a quiz after students have taken it affects new attempts only: past scores and the questions shown in a student's history are stored with the attempt.

### Adding a new course

Replace the object exported from `seed/course.ts`, giving it a new `slug`, and set `NEXT_PUBLIC_COURSE_SLUG` to the same value so the public website presents it. The schema supports several courses; see [Limitations](#limitations) for what the interface assumes.

### Adding a module

Add an entry to `modules`. Order in the array is the order students see.

```ts
{
  slug: "inverse-problems",
  title: "Inverse problems",
  description: "Recovering parameters from observations.",
  requiresPrevious: true,     // locked until the previous module's lessons are complete
  availableInDays: 14,        // optional: also locked until this many days from seeding
  lessons: [],
}
```

A module can also be added from `/admin/content`.

### Adding a lesson

Add an entry to the module's `lessons` and create `seed/lessons/<slug>.md`.

```ts
{
  slug: "adjoint-method",
  title: "The adjoint method",
  summary: "Computing gradients of a PDE-constrained objective at the cost of one extra solve.",
  durationMinutes: 30,
  objectives: ["Derive the adjoint equation for a linear problem"],
  videoUrl: "https://www.youtube.com/watch?v=...",   // optional; YouTube and Vimeo are embedded
  resources: [
    { title: "Starter notebook", kind: "notebook", url: "/resources/adjoint-starter.ipynb" },
    { title: "Further reading", kind: "reading", url: "https://arxiv.org/abs/..." },
  ],
}
```

Lesson Markdown supports:

- GitHub-flavoured Markdown: headings, lists, tables, task lists, block quotes
- Mathematics: `$inline$` and `$$display$$`, rendered with KaTeX
- Fenced code with a language tag, for example <code>```python</code>
- Figures: `![Alt text](/figures/plot.svg "Caption shown under the figure")`
- Links, which open in a new tab when external

Put figures in `public/figures` and downloadable files (PDFs, notebooks, datasets) in `public/resources`, and reference them by path. Resource kinds are `pdf`, `notebook`, `dataset`, `code`, `video`, `slides`, `reading` and `link`.

### Adding a quiz

Each module can have a `quiz`. All four question types:

```ts
quiz: {
  slug: "inverse-problems-quiz",
  title: "Inverse problems check",
  description: "Four questions on adjoints and regularisation.",
  passPercent: 70,
  maxAttempts: 3,            // optional; omit for unlimited retakes
  questions: [
    { type: "multiple_choice", prompt: "...", options: ["A", "B", "C"], answer: 1, explanation: "..." },
    { type: "multiple_select", prompt: "...", options: ["A", "B", "C"], answers: [0, 2], explanation: "...", points: 2 },
    { type: "true_false", prompt: "...", answer: false, explanation: "..." },
    { type: "short_answer", prompt: "...", accepted: ["0.5", "1/2"], explanation: "..." },
  ],
}
```

`answer` and `answers` are zero-based positions in `options`. Prompts, options and explanations accept Markdown and LaTeX; wrap text containing backslashes in `String.raw`, as the demo course does. Grading rules: multiple select is all or nothing, and short answers ignore case and spacing and compare numerically when both sides are numbers. Each question is worth one point unless `points` is set.

Re-seeding replaces a quiz's questions. Past attempts keep their own snapshot of the questions they answered, so history stays readable.

### Adding a project

```ts
project: {
  slug: "adjoint-optimisation",
  title: "Parameter estimation with the adjoint method",
  summary: "One sentence shown in lists.",
  description: "Markdown brief, with LaTeX if needed.",
  objectives: ["..."],
  requirements: ["..."],
  submissionInstructions: "Markdown shown above the submission form.",
  rubric: [
    { criterion: "Correctness", description: "What you look for.", points: 60 },
    { criterion: "Reporting", description: "...", points: 40 },
  ],
  dueInDays: 21,             // deadline relative to the moment of seeding
  resources: [],
}
```

The maximum score is the sum of the rubric points. Students submit a link to their work (a repository, a hosted notebook or a shared folder) with optional notes.

### Live sessions and announcements

Both can be defined in `seed/course.ts` (`liveSessions`, `announcements`) or created at `/admin/sessions` and `/admin/announcements`. `seed:content` only writes them when the course has none, so entries created in the instructor area are never overwritten.

## Managing students and instructors

The instructor area at `/admin/students` creates student accounts with an initial password and enrols them in a selected course. Share the password privately; students can change it in Settings. No email is sent by this action.

Existing students can be assigned to additional courses or moved between active, paused, completed and withdrawn enrolment states. Active and completed enrolments grant access. Paused and withdrawn enrolments remove access without deleting progress or submissions. The page also lists current enrolments.

Staff roles are assigned using the Supabase dashboard or SQL. The student-management forms cannot create instructors or administrators. For email invitations instead of initial passwords:

1. **Create the user** under Authentication, Users, with "Invite user". They receive an email with a link to set their password. A profile row is created automatically.

2. **Enrol them:**

   ```sql
   insert into public.enrollments (user_id, course_id)
   select p.id, c.id
   from public.profiles p, public.courses c
   where p.email = 'new.student@university.edu'
     and c.slug = 'scientific-machine-learning';
   ```

3. **To make someone an instructor:**

   ```sql
   update public.profiles set role = 'instructor' where email = 'you@university.edu';
   ```

Roles can only be changed with database access, never through the application. A signed-in user without an enrolment sees a page explaining that they are not enrolled yet.

## Rebranding

- Name, tagline, support email and navigation: `src/config/site.ts`
- Colours for light and dark themes: the token block at the top of `src/app/globals.css`
- Typefaces: `src/app/layout.tsx`
- Wordmark: `src/components/brand.tsx`
- FAQ and feature text on the landing page: `src/app/(site)/page.tsx`

## Limitations

- **One active course per student in the interface.** The schema supports several courses and enrolments, but the portal shows a student's most recent active enrolment and the instructor area manages the first course. There is no course switcher.
- **Some editing still needs the database or the seed files.** Modules cannot be renamed, reordered or deleted in the browser, lessons cannot be deleted (only unpublished), and existing resources cannot be edited (only removed and added again). There is no live preview while editing.
- **Downloadable files are public.** A resource is a link or a file in `public/`, which anyone with the address can open. There is no access-controlled file storage.
- **Project submissions are links, not uploads.** There is no file storage for student work.
- **Quizzes are submitted as a whole.** Answers are held in the browser until the final submission, so a closed tab loses an unfinished attempt. There is no time limit and no manually graded question type.
- **No rate limiting on the contact form** beyond a honeypot field, and no notification email when a message arrives. Messages are counted on the instructor overview and read in the database.
- **No Content-Security-Policy header.** Basic security headers are set in `next.config.ts`.
- **Accessibility** follows WCAG 2.1 AA practices (semantic structure, labelled controls, keyboard operation, visible focus, native dialogs for drawers), but has not been through a formal audit or assistive-technology testing.
- **Notifications are in-app only.** Students are not emailed about feedback, announcements or upcoming sessions.

## Possible extensions

- Bulk enrolment and emailed invitations for new students
- Module editing and reordering, lesson deletion, and a live Markdown preview in the editors
- Access-controlled storage for course files, with signed download links for enrolled students
- File uploads for submissions through Supabase Storage, with per-student access policies
- A course switcher for students enrolled in several courses
- Email notifications for feedback, announcements and session reminders
- Calendar export (`.ics`) for live sessions
- Per-criterion rubric scoring in reviews
- Saving quiz answers between sessions

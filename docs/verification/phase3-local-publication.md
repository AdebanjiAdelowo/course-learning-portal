# Phase 3 local development database publication

On 18 October 2026, DSA Modules 2, 3 and 4 were published in the **local development database**. This changed only their three `is_published` flags, and only after a backup had been taken and verified.

| Where | Recursion, Arrays and Linked Lists |
| --- | --- |
| Curriculum source on `main` | Published since `71f5280` (PR #2) |
| Local development database | **Published** on 18 October 2026, 10:52:02 UTC |
| Isolated regression stack | Published (test data only) |
| Any hosted Supabase project | **Not published.** Not contacted |

Nothing was deployed. No GitHub branch was changed.

## Context

- **Git:** `main` at `71f5280a9b19ef495678461aa5abc775f8326554`, matching `origin/main`, with a clean working tree before the report was written.
- **Database:** the local Supabase CLI project `course-learning-portal`, in database container `supabase_db_course-learning-portal`, with its own data volume. PostgreSQL 17.11, database `postgres`, port 54322; API at `http://127.0.0.1:54321`.
  - `.env.local` contains no hosted (`supabase.co`) URL.
  - The isolated regression stack (`-regression`, port 55322, separate volume) was used only for the scratch restore.
- **Targets:** `recursion-and-induction` (position 4), `arrays-and-amortised-analysis` (5) and `linked-lists` (6), in course `data-structures-and-algorithms`.

## Preconditions

- **Disk:** 16 GiB free on the host and 919 GiB in the Docker VM, against a 0.5 MB archive and a roughly 20 MB scratch restore.
- **Backup location:** `$HOME/course-learning-portal-backups/`, which is not iCloud-managed. Desktop and Documents are iCloud-synced on this machine.
- **Starting state:** 8 phases and 34 modules, with 3 published and 31 planned. All three targets were unpublished.
- **Content counts:** each target had 6 published lessons, 1 quiz with 10 questions, 1 project, and 5, 6 and 6 published problems respectively.
- **No content drift:** a read-only comparison against `main`'s seed source covered 68 items:
  - module metadata;
  - 18 lessons, including body, summary, objectives and order;
  - 30 questions, including options, answer keys, points and explanations;
  - 3 projects, including rubric, requirements and instructions;
  - 17 problems, including statement, starter, reference solution, editorial and hidden-test count.

  It found no differences. The same check passed on the freshly seeded regression stack, as a control.
- **Triggers:** the only trigger on `public.modules` is `modules_set_updated_at`, which sets `updated_at` on the updated row. Nothing else is written.

## Backup

| Field | Value |
| --- | --- |
| File | `$HOME/course-learning-portal-backups/phase3-20261018T105058Z/dev-public-auth-pre-phase3-20261018T105058Z.dump` |
| Created | 2026-10-18T10:50:58Z |
| Contents | Schemas `public` and `auth` of database `postgres`, PostgreSQL custom archive format (`pg_dump -Fc`) |
| Versions | pg_dump 17.11, server 17.11 |
| Size | 506,436 bytes |
| SHA-256 | `c9bd8e1e424f9eaae91d5ea441ae34d71c4b9b966f83687d6014544c7b9fbf13` |
| Permissions | File 600, directory 700 |

`pg_restore --list` read 646 entries, 51 of them table data.

**Scratch restore:**

- **Target:** a new database, `restore_check_20261018t105058z`, on the regression container, which uses its own volume and never the development server.
- **The `public` schema conflict was resolved properly:** the empty default `public` schema of the fresh scratch database was dropped before restoring. The restore then ran with `--no-owner --no-privileges --exit-on-error` and **exited 0 with no errors**.
- **Results:**
  - All 51 tables in `public` and `auth` had identical row counts in the source and the restore.
  - The source and restored fingerprints were identical: module IDs, order and flags, lesson and problem IDs, users, lesson progress (39), quiz attempts (8), project submissions (5) and code submissions (3).

The backup is kept. The scratch database was left in place on the disposable regression stack.

## Exact SQL executed

The SQL was `docs/verification/phase3-publication.sql`, unchanged since its review in `15ca3bd`, with SHA-256 `eb83b403093cc99aff23a2df9a5812f1804a4e316e286037bcf1fd579bb4c2e7`. The checksum was rechecked immediately before execution. It ran once:

```sh
docker exec -i supabase_db_course-learning-portal psql -U postgres -d postgres -v ON_ERROR_STOP=1 < docs/verification/phase3-publication.sql
```

The file runs in one transaction. It locks the DSA course's modules and then checks four things, aborting if any fails:

1. The course has 8 phases and 34 modules.
2. Exactly the three original modules are published.
3. The targets are at positions 4, 5 and 6.
4. Each target has 6 published lessons, 1 quiz, 1 project, and 5 or 6 problems.

It then runs `UPDATE public.modules SET is_published = true` for the three slugs where they are not yet published. Finally, it requires the result to be 6 published and 28 planned.

Output:

```text
BEGIN
DO
NOTICE:  Published 3 additional modules; six published and 28 planned
COMMIT
```

## Before and after

| Check | Before | After |
| --- | --- | --- |
| Phases | 8 | 8 |
| Modules | 34 | 34 |
| Published | 3 | 6 |
| Planned | 31 | 28 |
| Published positions | 1, 2, 3 | 1, 2, 3, 4, 5, 6 |
| Recursion, Arrays, Linked Lists | Unpublished | Published |
| Rows with a new `updated_at` | | Exactly the 3 targets, one shared timestamp |

**Protected fingerprint:** 28 lines in total. The query is kept with the private record.

- **Changed (2 lines, as intended):** the DSA publication counts and the list of published slugs.
- **Unchanged (26 lines, byte-identical):**
  - publication flags of the other course;
  - phases and courses;
  - all module columns except the flag (IDs, slugs, titles, phases, positions, `requires_previous`, availability, plans);
  - the IDs of the 28 planned modules;
  - lessons (48), quizzes (10), questions and answer keys (78 each), projects (10), coding problems and solutions (31 each), resources (31);
  - users (3), profiles (3), enrolments (4), lesson progress (39), quiz attempts (8), project submissions (5), code submissions (3);
  - feedback (6), cohorts (2), live sessions (9), announcements (6), enrolment requests (0) and contact messages (4).

## Application verification

A production build of `main` was made against the development database; only the development API URL is compiled in. It was served with `npm run start` and tested in installed Chrome. Only the public landing page and **temporary identities** were used, and no existing student was signed in as. Each browser suite hashed existing modules, enrolments and student activity before and after, and required them to match after deleting its temporary user.

| Check | Result |
| --- | --- |
| Public overview: "8 phases · 6 modules available · 28 modules planned", "6 of 34" | Passed |
| Portal curriculum shows the same counts | Passed |
| A new student finds DSA Modules 2 to 4 locked, by link and by direct address | Passed |
| Recursion opens after DSA Module 1's lessons; Arrays stays locked | Passed |
| Arrays opens after the Recursion lessons; Linked Lists stays locked | Passed |
| Linked Lists opens after the Arrays lessons | Passed |
| Planned `two-pointers` stays inaccessible with every published predecessor complete | Passed |
| Dashboard shows the first recursion lesson as the next step after DSA Module 1 | Passed |
| A published problem runs its visible samples in the Pyodide worker, labelled as local and not official grading | Passed |
| HTML and fetch payloads contain the visible samples but no hidden case, reference-solution line or editorial text | Passed |
| All three visualizers: axe WCAG 2.1 A/AA in both themes and at 390 pixels, keyboard operation, focus, contrast, error feedback, reduced motion | 18 passed |

The total was 23 tests: the two-test temporary unlock-chain spec (not committed), `phase3-published.spec.ts` and `phase3-accessibility.spec.ts`. Afterwards, the protected fingerprint was again identical to the post-publication fingerprint, and no temporary users or fixture modules remained.

The legacy `portal.spec.ts` suite was **not** run against this database, because it writes to the second demo student.

## Warnings and limitations

- The temporary sign-ins leave records in Supabase's own authentication logs, which the protected fingerprint does not cover. No student table was affected.
- Students who had completed DSA Module 1's lessons now see DSA Module 2 unlocked. Course completion percentages fall because the course gained 18 lessons, 3 quizzes and 3 projects. Both effects are intended.
- No real screen-reader session has been completed for the visualizers.

## Rollback

If needed, stop further writes and preserve the evidence first. Then, after confirming that no legitimate later changes would be overwritten, run the narrowly scoped reverse:

```sql
BEGIN;
UPDATE public.modules m SET is_published = false
  FROM public.courses c
 WHERE c.id = m.course_id AND c.slug = 'data-structures-and-algorithms'
   AND m.slug IN ('recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists');
-- Expect UPDATE 3, and the DSA counts 34 modules, 3 published, 31 planned, before COMMIT.
COMMIT;
```

Then compare the protected fingerprint with the pre-publication record. Student activity created while the modules were published stays stored.

`main`'s seed files say `published: true`, so a later `seed:content` run for these modules would publish them again.

Restoring the backup is a last resort that needs separate authorization. Restoring `public` and `auth` into a live Supabase database requires stopping the dependent services' connections and handling Supabase-managed owners.

## Private record

The backup manifest, the fingerprint queries and outputs (before, after, after the application checks, and the diff), the scratch-restore counts and fingerprints, the target rows before and after, the SQL output with timestamps, and the drift-check script are all kept beside the backup, in `$HOME/course-learning-portal-backups/phase3-20261018T105058Z/`. They contain hashes and counts only, no row data. They are not committed.

## Remaining

Hosted Supabase publication and deployment are still pending, and each needs separate approval.

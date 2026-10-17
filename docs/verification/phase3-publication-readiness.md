# Phase 3 publication readiness

This document records the release preparation for DSA Modules 2, 3 and 4. It was produced on 17 October 2026 on `feature/dsa-academy-phase-3`, starting from `15ca3bd`, with Node 24.4.1.

## Publication status

| Where | Recursion, Arrays and Linked Lists |
| --- | --- |
| Curriculum source code (`seed/*.ts`) | **Published** (`published: true`) on this branch, in local commits only |
| Isolated test database (`course-learning-portal-regression`, ports 5532x) | **Published**, for testing only |
| Existing local development database (`course-learning-portal`, ports 5432x) | **Not published.** Unchanged |
| Any hosted database | **Not published.** Not contacted |

Nothing was pushed, merged or deployed. The deployment status is unchanged.

## 1. Modules prepared

| Display number | Slug | Position | Lessons | Quiz | Project | Problems |
| --- | --- | --- | --- | --- | --- | --- |
| DSA Module 2 | `recursion-and-induction` | 4 | 6 | 10 questions | 100-point rubric | 5 |
| DSA Module 3 | `arrays-and-amortised-analysis` | 5 | 6 | 10 questions | 100-point rubric | 6 |
| DSA Module 4 | `linked-lists` | 6 | 6 | 10 questions | 100-point rubric | 6 |

Module IDs, slugs, phase associations, positions and `requiresPrevious: true` are unchanged. Python Modules P1 and P2 remain the only preparatory modules, and DSA numbering is unchanged.

## 2. Source changes

- `seed/recursion-module.ts`, `seed/arrays-module.ts` and `seed/linked-lists-module.ts`: `published: false` becomes `published: true`. This is exactly `docs/verification/phase3-publication.patch`, which applied cleanly. No lesson, quiz, project or problem content changed.
- `src/components/algorithm-player.tsx`: accessibility fixes (section 6).
- `package.json` and `package-lock.json`: `axe-core` 4.14.0 is pinned as a direct dev dependency. It was already installed through `eslint-plugin-jsx-a11y`, so nothing was downloaded.
- `README.md`: published and planned counts, curriculum table, tracer list and player accessibility.

## 3. Counts

| Metric | Before | After |
| --- | --- | --- |
| Phases | 8 | 8 |
| Modules | 34 | 34 |
| Published | 3 | 6 |
| Planned | 31 | 28 |
| Published lessons, quizzes, projects, problems | 17, 3, 3, 14 | 35, 6, 6, 31 |

## 4. Tests changed

Each changed expectation was checked against the curriculum and against `can_access_module` and `computeCourseProgress`. A module that `requiresPrevious` opens once every published lesson of the previous published module is complete. Quizzes and projects never block, and an unpublished module is never accessible.

**Unit**

- `blueprint.test.ts`: six published modules. Python and DSA Module 1 never wait for another module; DSA Modules 2 to 4 require the previous one. All 28 planned modules are empty.
- `phase3-publication.test.ts`: rewritten for the published state, checking the exact six slugs, positions 4 to 6, and 28 planned modules after position 6.
- `recursion-content`, `arrays-content` and `linked-content`: `published` is now `true`.
- New `phase3-unlocking.test.ts` (7 tests): unlocking on the real six-module outline, covering a new student, DSA Module 1 part done, DSA Module 1 lessons done, the recursion lessons done, and the arrays lessons done. It also documents that only the immediate predecessor gates a module.

**Integration** (`access-control.test.ts`)

- `PUBLISHED` now lists six modules. The seed-data check also requires positions 4 to 6, and that all 28 planned modules have no lessons, quizzes, projects or problems.
- The public outline carries the Phase 3 lesson, quiz, project and problem counts, and no `reference_solution`.
- The three draft-exclusion tests are replaced by checks that each module is published with student previews, while solutions and answer keys stay staff-only.
- New: a planned module stays closed to students even when it holds a published lesson.
- New block, using a temporary student who works through the real course, covering seven scenarios:
  1. A new student can open Python and DSA Module 1, but nothing later.
  2. Recursion stays locked while any DSA Module 1 lesson is unfinished.
  3. Recursion opens once all DSA Module 1 lessons are done, without the quiz or project.
  4. Arrays opens after the recursion lessons.
  5. Linked lists opens after the arrays lessons.
  6. In a locked module, the database refuses lesson progress and code drafts, and returns no problem rows or quiz questions.
  7. With the linked-list lessons done, planned `two-pointers` stays closed.
- New in the same block: a leak check over all 31 problems. It confirms no `hidden_tests`, `reference_solution` or `editorial_md` columns; samples disjoint from hidden cases; and no reference solution or editorial text in any row the student can read. Solutions and answer keys are unreadable.
- New in the same block: Phase 3 self-review. The editorial opens only after submission, a submission cannot claim a verdict, and the stored verdict stays `not_evaluated`.
- The original 14-problem check for the first demo student is kept. DSA Modules 2 to 4 are locked for that student, so 14 is still correct.

**Browser**

- Count assertions changed from 3 to 6 published modules and from 31 to 28 planned, in `portal.spec.ts` (dashboard, curriculum and landing page) and in `authoring.spec.ts` (instructor content page, twice).
- Problem counts: the practice list shows every published problem, so 14 becomes 31. The warm-up filter count becomes 11 (5 original plus 6 new).
- Next step: once the demo student finishes DSA Module 1's lessons, the next step becomes "Next lesson · DSA Module 2", which follows from the unlock rule.
- The Recursion, Arrays and Linked Lists specs now require their source module to be published. They still verify content through an isolated copy and a temporary student.
- New `phase3-published.spec.ts` (3 tests), on the real modules:
  - The modules show as locked by link and by direct address, and a planned module renders the same not-found page as a missing one.
  - Once DSA Module 1 is done, the recursion lesson is next.
  - A published problem runs its visible samples in the Pyodide worker under "Local sample-test results: not official grading.", without submitting anything.
  - The captured HTML, document and fetch payloads contain the visible samples (a positive control), but no hidden case, reference-solution line or editorial text.
- New `phase3-accessibility.spec.ts` (18 tests, section 6).

## 5. Verification

All results come from the final code, run against the isolated stack through `scripts/regression-env.mjs`.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, 0 warnings |
| `npm run typecheck` | Passed |
| `npm run test` | 295 passed (22 files) |
| `test:integration` | 79 passed |
| `python3 scripts/verify_content.py` | 168 code blocks in 97 Markdown files; 761 cases across 31 reference solutions |
| `build -- --webpack` | Passed |
| `build` (default Turbopack) | Passed warm, and again with the Turbopack cache moved aside (cold) |
| `test:e2e` on the Turbopack production build, installed Chrome | **69 passed** in 4.7 minutes |

The browser total breaks down as 32 portal, 5 authoring, 1 enrolment, 1 editor layout, 3 each for Recursion, Arrays and Linked Lists, 3 published-module and 18 accessibility tests. The build output referenced only the isolated API (port 55321). The Turbopack socket restriction did not reappear.

## 6. Accessibility findings

The automated scan used axe-core 4.14.0 (WCAG 2.0 and 2.1, levels A and AA), scoped to each visualizer. It ran in both themes and at 390 pixels wide, and was injected through the DevTools protocol so the page's Content-Security-Policy stayed unchanged. Keyboard behaviour was tested by driving real key presses in Chrome.

Two confirmed defects were fixed. Both were in the shared player, which predates Phase 3: the class conflict has been on `main` since `d32405e`. So the fixes apply to every visualizer.

1. **Primary buttons had no legible label.** `cn()` joins classes without resolving conflicts, so Play and "Run on this input" carried both `bg-surface` and `bg-accent`. Tailwind's stylesheet order made the surface colour win. The result was white text on white in the light theme, and dark text on the dark surface (contrast 1.0) in the dark theme. Screenshots confirmed both. The fix gives neutral and primary controls separate colour sets. axe missed the light-theme case, so a direct contrast test now requires at least 4.5:1 for Play, Step and "Run on this input" in both themes.
2. **Keyboard focus was lost at the ends of a trace.** Step, Back and Reset became `disabled` while focused, which dropped focus to the page body. They now use `aria-disabled` and do nothing at those boundaries. They keep the same faded appearance, ignore the pointer, stay in the tab order and are announced as unavailable. Tests confirm focus stays on Step at the last step and on Back at the first.

The following were verified with no change needed:

- Every control has an accessible name.
- The tab order is logical: Reset, Back, Play, Step, Speed, the step slider, then "Try your own input".
- A 2-pixel focus outline is visible on keyboard focus.
- Enter and Space operate the buttons; arrow keys and Home move the slider.
- Each step's explanation is announced through a polite, atomic live region.
- Invalid custom input raises an alert, sets `aria-invalid` on the list field, and leaves the existing trace intact.
- There's no keyboard trap: Tab leaves the player and Shift+Tab returns.
- Reduced motion collapses transitions, and playback never starts on its own.
- No horizontal overflow at 390 pixels.

**Limitation:** no assistive-technology testing (VoiceOver, NVDA or JAWS) was performed. Announcements were verified through the DOM, meaning live regions, alerts, names and states, not by listening. This is not a screen-reader pass. During playback each step is announced politely, which may be verbose at the fastest speed.

## 7. Database rehearsal (isolated stack only)

Isolation was confirmed before testing. The isolated stack is a separate Supabase project, `course-learning-portal-regression`, with its own named Docker volumes for the database and storage, and Postgres on port 55322 rather than 54322. The wrapper refuses any target other than `http://127.0.0.1:55321`.

- From a pre-release state (3 published), the production-safe scoped sync published the three modules: `npm run seed:content -- --module=<slug>` for each, run through the wrapper.
  - The only changes were those three `is_published` flags. Counts went to 6 published and 28 planned.
  - Module, lesson, problem, quiz and project IDs were unchanged, as were lesson progress, quiz attempts, project submissions and code submissions.
  - A second sync was byte-identical. No users were created: the stack held only its three existing demo accounts throughout.
- `phase3-publication.sql`, run with `ROLLBACK`, reported "Published 3 additional modules; six published and 28 planned" from the pre-release state, and published 0 on the already-published state. It is idempotent and safe to run after the sync.
- Temporary test students and fixtures were removed. No `e2e-` or `it-` modules remain, and each browser fixture verifies a hash of existing student activity after cleanup.

**Development database:** a fingerprint was taken before any work. It covered both courses' module IDs, positions, phases and flags; all lesson and problem IDs; and lesson progress, quiz attempts, project submissions and code submissions. It was identical after all testing. That database still has 3 of 34 DSA modules published.

## 8. Remaining risks

- **Database and code must stay in step.** Every content sync writes `is_published` from the seed files, so this branch's source publishes the modules wherever `seed:content` for those modules runs. Running `npm run seed` or `seed:content` from this branch against any database publishes them. Conversely, running the sync from an older branch would unpublish them.
- **Students' next step changes.** Any student who has finished DSA Module 1's lessons will immediately see DSA Module 2 unlocked, and their next step becomes the first recursion lesson. Course completion percentages fall, because the course gains 18 lessons, 3 quizzes and 3 projects.
- **Not-found pages return HTTP 200.** The portal streams, so a not-found page is served with status 200 and the not-found UI. This is documented Next.js behaviour, predates this work, and does not affect access.
- **Accessibility:** see the screen-reader limitation in section 6.

## 9. Approvals required

1. Pushing `feature/dsa-academy-phase-3` to GitHub, and opening a pull request to `main`.
2. Merging into `main`.
3. Publishing in the local development database: run `npm run seed:content -- --module=<slug>` for `recursion-and-induction`, `arrays-and-amortised-analysis` and `linked-lists`, or run `docs/verification/phase3-publication.sql`. Do this after a backup, and never run the full `npm run seed` there, because it rebuilds demo activity.
4. Any hosted database: the same content sync with that project's credentials, after a backup.
5. Deployment.

## 10. Rollback

- **Source:** revert the release commit, or reverse the patch with `git apply -R docs/verification/phase3-publication.patch` together with the matching test changes.
- **Database:** sync the three modules again from the reverted source. Alternatively, run `update public.modules set is_published = false where slug in ('recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists')` on the DSA course, after checking the target database and taking a backup.
- **Effect:** both are flag changes only. Student progress, attempts and submissions remain stored and reappear if the modules are republished. Students lose access to those modules while they are unpublished.

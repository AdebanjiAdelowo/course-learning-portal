# Phase 4 publication readiness

This is the release candidate for DSA Module 5 (`two-pointers`) and DSA Module 6 (`sliding-window`) on `feature/dsa-academy-phase-4`, prepared on 18 October 2026.

| Where | Two Pointers and Sliding Window |
| --- | --- |
| Curriculum source (`seed/*.ts`) | **Published** (`published: true`), in local commits only |
| Isolated test database (`course-learning-portal-regression`, port 55322) | **Published**, rehearsal and tests only |
| Local development database (`course-learning-portal`, port 54322) | **Not published.** Unchanged: 6 of 34 DSA modules published, and these two modules have **no content loaded yet** |
| Hosted databases | **Untouched** |
| Deployment | **Not performed** |

## Independent review

All 12 lessons, 20 quiz questions, 2 projects and 12 coding problems were re-derived:

- **Sorted preconditions:** stated and demonstrated with a failing unsorted case.
- **Duplicate handling:** triplet skips are safe, and the "compare with the last kept value" equivalence holds.
- **In-place contracts:** the valid prefix versus leftovers is spelled out.
- **Sign requirements for windows:** stated accurately.
- **Frequency-map invariants:** maintained, including the `missing` counter.
- **Prefix-sum alternatives:** the exact-sum count and the monotonic queue over prefix sums are both checked against brute force.
- **Amortised arguments:** aggregate and accounting, both sound.

Two defects were found and fixed, each with a regression test that checks the claim by computation:

1. **Fast and slow pointers.** The proof said the forward distance from slow to fast decreases by one per step. It increases. The distance from fast forwards to slow is what falls by one.
2. **Product windows.** The lesson said positive values keep products growing. That holds only for values of at least 1; a positive fraction shrinks the product and breaks closure under shrinking. The lesson and quiz now say positive integers, and the quiz prompt says "For integer inputs".

**Oracles.** The 12 oracles in `scripts/phase4_oracles.py` enumerate every pair, triple or window directly and share no logic with the reference solutions. All 347 cases match. The script now also checks that every case satisfies its problem's stated constraints (ranges, sorted input, alphabet, k bounds), and a positive control confirms invalid cases are rejected. The quiz answer keys were all confirmed.

## Assessment security (all 43 problems)

- **Server-side only:** hidden tests, reference solutions and editorials live in the staff-only `coding_problem_solutions` table. The practice page reads the editorial only through `problem_editorial`, which releases it to staff or after the student submits.
- **No seed data in client code:** no client code imports seed files.
- **Minimal browser data:** the workspace receives only the starter code, attempts, function name and visible samples, and the Pyodide worker runs only those samples.
- **New `tests/e2e/assessment-security.spec.ts`:**
  - **Bundle scan:** the client bundle (`.next/static`) contains no hidden-test signature, reference-solution line or editorial sentence for any of the 43 problems. A positive control confirms the scan sees real client code.
  - **Page scan:** a temporary student with every published lesson complete opens the practice list and all 43 problem pages. Each page's HTML, document and fetch payloads include its visible samples (the positive control) and nothing protected. The student submits nothing.
- **Integration:**
  - Students cannot read solutions or answer keys.
  - The leak check covers all 43 problems for a fully unlocked student.
  - The 12 Phase 4 problems open once unlocked, but release no editorial before a submission and refuse a claimed verdict.

## Accessibility

- **Shared visualizer checks** pass for both new visualizers and the three Phase 3 ones (30 tests): axe WCAG 2.1 A/AA in both themes and at 390 pixels, keyboard order, visible focus, contrast of at least 4.5:1, focus kept at trace ends, polite narration, alerts on invalid input, no keyboard trap, reduced motion, and the keyboard-scrollable array strip.
- **Mode control (2 tests):** it is labelled, operable by type-ahead, and keeps focus while fields change.
- **Code editor:** Esc then Tab, or Esc then Shift+Tab, both leave the editor.

**Limitation:** no real VoiceOver, NVDA or JAWS session was performed. Announcements were verified through the DOM only.

## Source publication

The only source change is `published: true` in `seed/two-pointers-module.ts` and `seed/sliding-window-module.ts`. Slugs, positions, phases, plans and all content are unchanged. The source curriculum has 8 phases, 34 modules, 8 published, 26 planned and 43 coding problems.

Publication-dependent tests were updated from observed application behaviour:

- **Unit:** eight published modules; 26 empty planned modules; a new unlocking chain from Linked Lists to Two Pointers to Sliding Window.
- **Integration:** published Phase 4 modules; a new chain test; the first still-planned module, Stacks, as the closed planned module; 43-problem leak coverage; search finds Sliding Window but not a planned module.
- **Browser:**
  - Counts are now 8 available, 26 planned, 43 problems and 14 warm-ups.
  - Stacks is the planned example; it gets a temporary plan, restored afterwards, so the plan view is still tested.
  - The Two Pointers admin card shows Published with its plan.
  - The Phase 4 fixtures expect a published source module.

## Isolated publication rehearsal

**Target confirmed first:** Supabase CLI project `course-learning-portal-regression`, volume `supabase_db_course-learning-portal-regression`, port 55322. The development database was not used.

**Pre-state:** both flags were set to false, the state the development database will be in once content is loaded.

**Guard tests:** every one aborted with no change, and the fingerprint was identical afterwards:

| Case | Result |
| --- | --- |
| Missing variables | Refused |
| Wrong confirmation word | Refused |
| The development database's module IDs | Refused: IDs do not match |
| Wrong total module count | Refused |
| A target without its lessons | Refused: content incomplete |
| One module already published | Refused: partial state |

**Positive path:**

| Step | Result |
| --- | --- |
| Publish | 8 published, 26 planned. Only the two flag lines of the protected fingerprint changed; exactly the two target rows were stamped |
| Run again | Reported "already published; nothing was changed"; fingerprint identical |
| `phase4-rollback.sql` | Restored the pre-state fingerprint exactly |
| Publish again | Identical to the first publication |
| Scoped `seed:content` for both modules, twice | Module, lesson, problem, quiz and project IDs and all student activity identical |

**Progression** on the published isolated stack, from integration and unit tests: Two Pointers opens after the Linked Lists lessons, Sliding Window after the Two Pointers lessons, and Stacks stays closed even when every published lesson is complete. Existing module IDs and order are unchanged, and no student rows changed.

## Release procedure for the local development database (not executed)

The development database has the two module rows but **no Phase 4 content**. The guarded SQL refuses to publish empty modules, so load the content first, unpublished, then flip the flags.

**1. Back up and verify.** Use the Phase 3 method: a `pg_dump -Fc` of `public` and `auth` to `$HOME/course-learning-portal-backups/phase4-<stamp>/`, a SHA-256 checksum, and a scratch restore into a database on the regression container with `--exit-on-error`, followed by a row-count comparison. Also record the protected fingerprint.

**2. Load the content unpublished**, from commit `0d368e3`. That commit has the same lesson, problem, quiz and project content as the release (verify with `git diff --stat 0d368e3 HEAD -- seed/lessons seed/problems`), with both modules still drafts:

```sh
git switch --detach 0d368e3
npm run seed:content -- --module=two-pointers
npm run seed:content -- --module=sliding-window
git switch feature/dsa-academy-phase-4      # or main, once merged
```

Module-scoped syncs refuse any non-local database. Confirm that both modules now hold 6 lessons and 6 problems and are still unpublished, and that student data is unchanged.

**3. Publish the two flags:**

```sh
docker exec -i supabase_db_course-learning-portal psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -v two_pointers_id=31f0a4d9-661c-40d8-8232-f3c18246f867 \
  -v sliding_window_id=4863f0dd-61d2-436e-81aa-e1f1b2f841a9 \
  -v expected_all_modules=38 -v confirm=publish-phase4 < docs/verification/phase4-publication.sql
```

The IDs and the total of 38 modules (34 DSA plus 4 in the older course) were read from the development database on 18 October 2026. Re-read them before running.

**4. Verify:** the DSA course has 34 modules, 8 published and 26 planned. The protected fingerprint differs only in its two flag lines; the student-activity lines are unchanged. Then run application checks with temporary identities.

**Alternative:** syncing from the release branch publishes each module as it loads its content, because the source flag is true. The SQL then only verifies the result ("already published"). This skips the separate flag step.

**Rollback:** `docs/verification/phase4-rollback.sql` with `confirm=unpublish-phase4`. It changes only the two flags back and keeps student activity. Restoring a full backup needs separate approval.

**Effect on students:** students who have finished the Linked Lists lessons will see Two Pointers unlocked, and completion percentages fall as the course grows.

## Approvals still required

1. Push `feature/dsa-academy-phase-4` and open a pull request. `docs/phase3-publication-record` (`bb471ab`) also awaits a push decision.
2. Merge.
3. Back up the development database and publish there, following the procedure above.
4. Any hosted publication or deployment.

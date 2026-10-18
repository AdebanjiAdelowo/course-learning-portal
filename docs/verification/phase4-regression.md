# Phase 4 regression

This is the full regression for DSA Module 5 (Two Pointers) and DSA Module 6 (Sliding Window), which are integrated as **unpublished drafts**. It was run on 18 October 2026 on `feature/dsa-academy-phase-4`, branched from `main` at `71f5280`, with Node 24.4.1.

Nothing was pushed, merged, published or deployed. No hosted database was contacted. The local development database was not modified.

## Curriculum state

Both source and the isolated test database have 8 phases and 34 modules, 6 of them published and 28 planned. The two drafts sit at positions 7 and 8 and remain planned for students, still showing their plans. Every other module keeps its slug, phase and position. The 26 unwritten modules have no content.

In the isolated stack, the seed loads 47 lessons, 8 quizzes, 8 projects and 43 coding problems: 35, 6, 6 and 31 published, plus 12, 2, 2 and 12 in the drafts.

## Commands and results

```sh
export PATH=/Users/adebanjiadelowo/.nvm/versions/node/v24.4.1/bin:$PATH
npm run lint && npm run typecheck && npm run test
python3 scripts/verify_content.py
python3 -I scripts/phase4_oracles.py --check
node scripts/regression-env.mjs seed                 # isolated stack only (port 55321)
node scripts/regression-env.mjs test:integration
node scripts/regression-env.mjs build -- --webpack
node scripts/regression-env.mjs build                # default Turbopack, cold cache
node scripts/regression-env.mjs seed
PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_WEB_SERVER='npm run start' node scripts/regression-env.mjs test:e2e
```

| Check | Phase 3 baseline | Phase 4 result |
| --- | --- | --- |
| ESLint | Passed | Passed, 0 warnings |
| TypeScript | Passed | Passed |
| Unit tests | 295 | **316 passed** (25 files, previously 22) |
| Integration tests | 79 | **82 passed** |
| Content verifier, Python blocks | 168 | **207** in 133 Markdown files, every runnable block also run on its own |
| Coding-problem cases | 761 across 31 solutions | **1108** across 43 solutions |
| Oracle check | | **347** cases across 12 problems |
| Browser tests | 69 | **89 passed** in 7.4 minutes |
| Webpack production build | Passed | Passed |
| Default Turbopack production build | Passed | Passed, from a cold cache |

**The 89 browser tests are:**

| Group | Tests |
| --- | --- |
| Portal | 32 |
| Authoring | 5 |
| Enrolment | 1 |
| Editor layout | 1 |
| Recursion, Arrays and Linked Lists | 3 each |
| Phase 3 published modules | 3 |
| Two Pointers and Sliding Window | 3 each |
| Shared visualizer accessibility checks | 30 (18 for the Phase 3 visualizers, 12 for the Phase 4 ones) |
| Phase 4 Mode control | 2 |

The build compiled in only the isolated API URL. The Turbopack socket restriction did not reappear.

## Tests added or changed

**New unit tests:**

- `two-pointers-viz.test.ts` and `sliding-window-viz.test.ts`: tracers compared with brute-force oracles, invariants, counters and preconditions.
- `phase4-content.test.ts`: section standards, visualizer blocks, quizzes, rubrics, sample and hidden disjointness, starters and statements that reveal no solution logic, positions, and numeric quiz answers recomputed by brute force.

**Changed unit tests:** `blueprint.test.ts` now requires the 26 unwritten modules to be empty and the two drafts to be unpublished and complete.

**Integration (`access-control.test.ts`):**

- The seed-data test is now draft-aware: 6 published modules, the drafts at positions 7 and 8, and 26 empty modules.
- New: both drafts' lessons, quizzes, projects, problems and outlines stay hidden from students, and progress writes are refused.
- New: all 12 draft problems, with their hidden tests, solutions and editorials, stay unreachable even for a student who has unlocked every published module. Submissions are refused, and samples are disjoint from hidden cases at the database level.
- The authored-problem count is now 43.

**Browser:**

- New `two-pointers.spec.ts` and `sliding-window.spec.ts`, using the shared fixture `support/draft-module.ts` and the shared checks in `support/module-checks.ts`.
- New `phase4-accessibility.spec.ts`.
- The Phase 3 accessibility checks moved, unchanged, into `support/visualizer-a11y.ts`.
- `authoring.spec.ts` uses the unwritten "Stacks, queues and deques" for its "cannot publish an empty module" check, because Two Pointers now holds draft lessons. It still verifies the Two Pointers plan section.

**Tooling:**

- `scripts/verify_content.py` now also runs every `python-run` block on its own, as the browser's Run button does.
- New `scripts/phase4_oracles.py`.

## Security findings

Hidden tests and reference solutions stay in the staff-only `coding_problem_solutions` table. The practice page sends only visible samples to the browser.

All 12 new problems are covered by the extended checks: unit-level sample and hidden disjointness, database-level checks as a fully unlocked student, and browser runs of every visible sample in the Pyodide worker, still labelled "Local sample-test results: not official grading.". Submissions remain self-review, and a student cannot claim a verdict.

No security control was weakened.

## Accessibility findings

Automated scans use axe-core 4.14.0 (WCAG 2.0 and 2.1, A and AA) in both themes and at 390 pixels wide. Keyboard checks drive real key presses in Chrome.

**Defects found and fixed.** Both predate Phase 4, and the fixes apply to every visualizer and editor:

1. **The visualizer's array strip could not be scrolled by keyboard on phones.** axe reported `scrollable-region-focusable` at 390 pixels once a list had about seven cells. The strip is now a focusable, named region (`Array cells, scrollable`), the same pattern the site uses for wide tables.
2. **The code editor's documented escape failed backwards.** "Press Esc, then Tab" worked, but Esc followed by Shift+Tab indented instead of leaving. The Shift keydown that starts a Shift+Tab was treated as "another key" and cancelled the Escape. Modifier keys pressed alone are now ignored. The shared accessibility suite exercises Esc then Shift+Tab as a regression test.

**Verified with no change needed:**

- The new Mode control is a labelled native select that follows the list in the tab order and can be operated by type-ahead.
- Switching modes shows or hides the numeric field without losing focus, and axe passes in every mode.
- Shared checks pass for both new visualizers: tab order, visible 2-pixel focus outline, contrast of at least 4.5:1, focus kept at the ends of a trace, polite live narration, alerts on invalid input, no keyboard trap, and reduced motion.

**Limitation:** no real screen-reader session (VoiceOver, NVDA or JAWS) was performed. Announcements were verified through the DOM only. On macOS, arrow keys open a native select's menu, so mode changes are tested with type-ahead, which works on every platform.

## Data preservation

The development database's protected fingerprint (the same one used for the Phase 3 publication) was identical at the start and end of Phase 4: 34 DSA modules with 6 published, 48 lessons, 31 problems and unchanged student activity.

The Phase 3 backup in `$HOME/course-learning-portal-backups/` was not touched. All browser fixtures removed their temporary modules and users, and the isolated stack contained no `e2e-` fixtures afterwards.

## Limitations

- No screen-reader session, as noted above.
- The drafts were checked through temporary published copies. Their real publication path (a scoped `seed:content` sync or a flag change) is not part of this phase.
- Plan text shown to students for the two planned modules now describes the authored lessons. It reaches a database only through a later content sync.

## Status

Phase 4 development is complete and verified locally on `feature/dsa-academy-phase-4`. Both modules remain unpublished drafts, ready for a separate publication review.

# Phase 3 regression and publication readiness

Final regression for DSA Modules 2, 3 and 4 (`recursion-and-induction`, `arrays-and-amortised-analysis`, `linked-lists`), run on 17 October 2026 from `feature/dsa-academy-phase-3` at `22eb090` with Node 24.4.1. All three modules remain unpublished. Nothing was pushed, merged, deployed or sent to hosted Supabase.

## Isolated regression stack

The full legacy browser suite writes to the second demo student, so it runs against a separate local Supabase project rather than the existing development stack.

```sh
export PATH=/Users/adebanjiadelowo/.nvm/versions/node/v24.4.1/bin:$PATH
node scripts/prepare-regression-stack.mjs           # writes tests/regression-stack/ (gitignored), ports 55320-55329
npx supabase start --workdir tests/regression-stack  # project course-learning-portal-regression
node scripts/regression-env.mjs seed                 # full demo seed, isolated stack only
```

`scripts/regression-env.mjs` reads the isolated stack's keys, refuses to run unless its API is `http://127.0.0.1:55321`, and runs one npm script (`seed`, `test:integration`, `test:e2e`, `build` or `start`) with that environment. Process environment takes precedence over `.env.local`, and `NEXT_PUBLIC_*` values are compiled into the bundle, so the build must also go through the wrapper. The built output referenced port 55321 only.

A fingerprint of the development stack (module IDs, positions, phases and flags; lesson and problem IDs; lesson progress, quiz attempts, project submissions and code submissions) was identical before and after the whole run.

## Results

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no warnings |
| `npm run typecheck` | Passed |
| `npm run test` | 288 passed |
| `node scripts/regression-env.mjs test:integration` | 70 passed |
| `python3 scripts/verify_content.py` | 168 code blocks in 97 Markdown files; 761 cases across 31 reference solutions |
| `node scripts/regression-env.mjs build -- --webpack` | Passed |
| `node scripts/regression-env.mjs build` (default Turbopack) | Passed, with a clean Turbopack cache (see below) |
| `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_WEB_SERVER='npm run start' node scripts/regression-env.mjs test:e2e` | 48 passed in 4.0 minutes on the Turbopack production build |

The 48 browser tests are 32 portal, 5 authoring, 1 enrolment, 1 mobile editor layout and 9 Phase 3 tests (three each for Recursion, Arrays and Linked Lists).

Seeding is idempotent. Repeating the full seed kept every phase, module, lesson, quiz, project and problem ID; by design it rebuilds only demo-account activity, and it refuses remote projects. Scoped `seed:content -- --module=<slug>` syncs of the three modules left the database byte-identical, including all student rows.

## Turbopack diagnosis

The earlier `creating new process -> binding to a port -> Operation not permitted (os error 1)` failure is an execution-environment restriction, compounded by Turbopack's persistent cache. It is not an application, filesystem or dependency defect.

- Turbopack evaluates CSS through PostCSS and webpack-loader workers. These are Node processes reached over a loopback socket.
- In an unrestricted shell, the committed configuration (`@tailwindcss/turbopack`) builds successfully, both warm and with a cold cache.
- `sandbox-exec -p '(version 1)(allow default)(deny network-bind (local ip))' npx next build` reproduces the exact error chain. A plain Node bind probe in the same profile fails with `EPERM`. The failing chain passes through `PostCssTransformedAsset`, so replacing the Tailwind Turbopack loader with `@tailwindcss/postcss` would not avoid it.
- After a restricted run, `.next/cache/turbopack` retains the failed loader result. Restoring that cache makes an unrestricted build fail deterministically; moving it aside makes the same build pass. This is the most likely reason the recursion checkpoint saw the failure persist outside the sandbox.

Workaround if the failure recurs: build outside the restricted environment, and move the stale cache aside first (`mv .next/cache/turbopack <somewhere-outside-the-repo>`) rather than deleting it. `npm run build -- --webpack` remains a verified alternative. No build configuration or dependency change is required.

## Publication readiness

All three modules are complete: six lessons each with executed Python, a ten-question quiz using all four question types with a 70 percent threshold, a 100-point rubric project, and five (Recursion) or six (Arrays, Linked Lists) practice problems. Each problem has three visible samples and 11 to 40 hidden cases. Every quiz key was rechecked by hand. Starter files are stubs that contain no solution logic.

Hidden tests and reference solutions live in `coding_problem_solutions`. That table is staff-only under row-level security, and editorials are released through `problem_editorial` only to staff or students who have submitted. The practice page sends only visible samples to the browser. Each module's unit test checks that samples and hidden cases are disjoint.

The visualizers use labelled native controls, an `aria-live` narration region and `role="alert"` validation errors. The browser suites drive these controls through accessible roles and labels, check invalid operations, and check a 390-pixel viewport for horizontal overflow. No dedicated keyboard-only or screen-reader pass was made.

## Publication rehearsal

On the isolated stack only:

- `phase3-publication.sql`, run with its final `COMMIT` replaced by `ROLLBACK`, passed every guard and reported six published and 28 planned.
- Applying `phase3-publication.patch` and syncing the three modules changed only those modules' `is_published` flags. Student rows and all content IDs were unchanged, and a second sync was a no-op. Reverting the patch and syncing restored the original module hash exactly.
- With the modules published, the existing tests that encode the draft state fail as expected: 6 unit, 7 integration and 10 browser tests, with 6 further browser tests not run behind failed fixture guards. No product behavior failed. The dashboard's new "Next lesson · DSA Module 2" for a student who has finished DSA Module 1's lessons follows the documented rule that only lessons gate the next module.

## Publication procedure (not applied)

1. Apply `docs/verification/phase3-publication.patch`. It sets `published: true` in the three seed module files. This is required: the seed writes `is_published` from these files on every sync, so a database-only change would be reverted by the next content sync.
2. Update the tests that assert draft state, in the same commit:
   - Unit: `tests/unit/phase3-publication.test.ts` (both cases), `blueprint.test.ts` (published-module list), and the "established slug" cases in `recursion-content`, `arrays-content` and `linked-content`.
   - Integration (`tests/integration/access-control.test.ts`): `PUBLISHED`, the draft-inaccessibility cases at lines 186 and 488, the outline and path cases, and the 14-problem sample-disjointness count (31 after publication). Extending that check to 31 problems brings the new problems under the student-facing leak test.
   - Browser: the `is_published === false` guard in the Recursion, Arrays and Linked Lists fixtures (line 53). These suites should then exercise the real published modules or clone them without that guard. Also update the counts in `authoring.spec.ts:222` and in `portal.spec.ts` at lines 155, 165, 317, 463, 639 and 1076.
3. Rerun the full regression above. Expect 8 phases, 34 modules, 6 published and 28 planned.
4. For each target database, after approval: back it up, then run `npm run seed:content -- --module=<slug>` for each module, or run `phase3-publication.sql`, which only flips flags and aborts unless the curriculum shape, existing publication state, positions 4 to 6 and content counts all match. Running both is safe; the SQL is idempotent once applied.

Risk to student records: none observed. Publication writes only `modules.is_published` for three rows, and the scoped sync rewrites only those modules' content. Quiz questions are replaced on sync, but attempts store their own question snapshot. Students who have completed DSA Module 1's lessons will immediately see DSA Module 2 unlocked as their next lesson, and published-module counts rise across the dashboard, curriculum and landing page. Rollback is the same flag change in reverse.

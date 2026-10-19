# Phase 4 regression

This is the regression record for DSA Module 5 (Two Pointers) and DSA Module 6 (Sliding Window) on `feature/dsa-academy-phase-4`, branched from `main` at `71f5280`, using Node 24.4.1. It has two parts:

1. **Draft verification**, at `63d0c8f`: both modules authored as unpublished drafts.
2. **Release candidate**, on 18 October 2026: independent review fixes and source publication of both modules. See `phase4-publication-readiness.md`.

Nothing was pushed, merged or deployed. No hosted database was contacted. The local development database was never modified, and its protected fingerprint was identical throughout. Every write went to the isolated regression stack (Supabase project `course-learning-portal-regression`, port 55322).

## Curriculum state

| | Drafts (`63d0c8f`) | Release candidate |
| --- | --- | --- |
| Source | 8 phases, 34 modules, 6 published, 28 planned | 8 phases, 34 modules, **8 published, 26 planned**, 43 problems |
| Isolated test database | Same as source | Same as source, plus the publication rehearsal |
| Development database | 6 published; no Phase 4 content | Unchanged: 6 published; no Phase 4 content |

## Commands

```sh
export PATH="$HOME/.nvm/versions/node/v24.4.1/bin:$PATH"   # Node 24.4.1
npm run lint && npm run typecheck && npm run test
python3 scripts/verify_content.py
python3 -I scripts/phase4_oracles.py --check
node scripts/regression-env.mjs seed                 # isolated stack only
node scripts/regression-env.mjs test:integration
node scripts/regression-env.mjs build -- --webpack
node scripts/regression-env.mjs build                # default Turbopack, cold cache
node scripts/regression-env.mjs seed
PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_WEB_SERVER='npm run start' node scripts/regression-env.mjs test:e2e
```

## Results

| Check | Phase 3 baseline | Drafts | Release candidate |
| --- | --- | --- | --- |
| ESLint | Passed | Passed, 0 warnings | Passed, 0 warnings |
| TypeScript | Passed | Passed | Passed |
| Unit tests | 295 | 316 | **319 passed** (25 files) |
| Integration tests | 79 | 82 | **83 passed** |
| Python blocks | 168 | 207 | **207**, each runnable block also run on its own |
| Coding-problem cases | 761 | 1108 | **1108** across 43 reference solutions |
| Oracle and contract check | | 347 | **347** cases, all within their stated constraints |
| Browser tests | 69 | 89 | **91 passed** in 9.8 minutes |
| Webpack production build | Passed | Passed | Passed |
| Default Turbopack production build | Passed | Passed (cold) | Passed (cold) |

**The 91 browser tests are:**

| Group | Tests |
| --- | --- |
| Portal | 32 |
| Authoring | 5 |
| Enrolment | 1 |
| Editor layout | 1 |
| Recursion, Arrays and Linked Lists | 3 each |
| Phase 3 published modules | 3 |
| Two Pointers and Sliding Window | 3 each |
| Shared visualizer accessibility checks | 30 |
| Phase 4 Mode control | 2 |
| Assessment security | 2 (new) |

**An earlier full run had two failures:**

- **Curriculum test.** My first version assumed a published module is always a link, but locked modules render without one. The test now checks the lock reason; this was a test defect, now fixed.
- **Arrays practice test.** It timed out after 5 seconds waiting for the "Draft saved" confirmation, late in a 10.6-minute run. That code is unchanged, and it passed 3 out of 3 in isolation and in the final full run. I treated it as a load-related timing flake and did not alter the test.

## Release-candidate changes

- **Review fixes:**
  - The fast-and-slow-pointers proof now names the quantity that decreases.
  - Product windows now say positive integers, in the lesson and the quiz prompt.
  - Regression tests check both claims by computation.
  - `scripts/phase4_oracles.py` checks every case against its problem's stated constraints.
- **Source publication:** `published: true` for both modules. Publication-dependent unit, integration and browser assertions were updated from observed behaviour, as detailed in the readiness document. A new unlocking-chain test covers Linked Lists, then Two Pointers, then Sliding Window, with the first planned module (Stacks) closed.
- **Security:** new `tests/e2e/assessment-security.spec.ts` scans the client bundle and the payloads of all 43 practice pages.
- **Guarded SQL:**
  - `phase4-publication.sql` and `phase4-rollback.sql` require the target database's module IDs, its total module count and a confirmation word.
  - They refuse partial states and empty modules.
  - Both were rehearsed on the isolated stack only.

## Security findings

Hidden tests, reference solutions and editorials stay server-side for all 43 problems. They appear in neither the client bundle nor any student-facing payload before a submission, and the Pyodide runner receives only visible samples. Self-review is unchanged: no submission can claim a verdict, and editorials open only after a submission. No security control was weakened.

## Accessibility findings

Defects fixed in the draft phase: the keyboard-scrollable visualizer strip, and leaving the editor with Esc then Shift+Tab. The release-candidate runs of all 32 accessibility tests pass.

**Limitation:** no real screen-reader session (VoiceOver, NVDA or JAWS) was performed.

## Limitations

- No screen-reader session.
- The arrays timing flake described above.
- Development-database publication needs the two-step procedure in the readiness document, because that database holds no Phase 4 content yet.

## Status

Phase 4 is a locally committed, verified release candidate on `feature/dsa-academy-phase-4`. It is published in source and rehearsed on the test database. It is not published in the development database and not deployed.

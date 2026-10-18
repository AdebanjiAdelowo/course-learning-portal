# Two Pointers verification checkpoint

DSA Module 5, `two-pointers`, is authored, integrated and browser-verified as an **unpublished draft**. It keeps its existing slug, title, description, phase ("Linear structures and sorting") and global position 7. Students still see it as a planned module, with its objectives, lesson titles and prerequisites. Its content was synced only to the isolated regression stack, never to the local development database or any hosted project.

## Lessons

| # | Slug | Title | Runnable blocks | Visualizer |
| --- | --- | --- | --- | --- |
| 1 | `two-pointer-fundamentals` | Two-pointer fundamentals and loop invariants | 1 | |
| 2 | `opposite-direction-pointers` | Opposite-direction pointers on sorted sequences | 3 | `two-pointers`, mode `opposite` |
| 3 | `same-direction-pointers` | Same-direction pointers and in-place transformations | 2 | `two-pointers`, mode `same` |
| 4 | `fast-and-slow-pointers` | Fast and slow pointers | 2 | |
| 5 | `pair-triplet-and-optimization-problems` | Pair, triplet and optimization problems | 3 | |
| 6 | `two-pointer-proofs-and-pattern-selection` | Correctness proofs, complexity and pattern selection | 2 | |

Every lesson has these sections: learning objectives, technical explanation, worked example, correctness (with a stated invariant), complexity, common mistakes and practice exercises. Each runnable example ends in assertions, and most compare against a brute-force version. The lessons include a checked counterexample showing the pair search failing on unsorted input (`[9, 1, 2]`, target 3). They are original prose and use no em or en dashes.

## Assessment and project

- **Quiz `two-pointers-quiz`:** 10 questions using all four types, with a 70 percent pass mark. Each answer is explained, and the numeric short answers (8 moves, capacity 49) are recomputed by brute force in `tests/unit/phase4-content.test.ts`.
- **Project `two-pointer-strategy-laboratory`:** 100-point rubric (implementation and contracts 30, correctness proofs 25, testing and differential checks 25, comparison and communication 20), with eight requirements.

## Coding problems

| Slug | Title | Difficulty | Function | Samples | Hidden |
| --- | --- | --- | --- | --- | --- |
| `pair-sum-sorted` | Pair sum in a sorted list | core | `pair_sum_sorted(values, target)` | 3 | 30 |
| `dedupe-sorted` | Deduplicate a sorted list in place | core | `dedupe_sorted(values)` | 3 | 25 |
| `zeros-to-end` | Move zeros to the end | warm-up | `zeros_to_end(values)` | 3 | 25 |
| `alnum-palindrome` | Letters-and-digits palindrome | warm-up | `alnum_palindrome(text)` | 3 | 26 |
| `triplets-with-sum` | Distinct triplets with a target sum | challenge | `triplets_with_sum(values, target)` | 3 | 24 |
| `widest-container` | Widest water container | core | `max_container_area(heights)` | 3 | 26 |

These cover the brief's six problems (Two Sum II, Remove Duplicates from Sorted Array, Move Zeroes, Valid Palindrome, 3Sum and Container With Most Water). The titles, statements, contracts and editorials are original, not copied from any platform.

Every expected value was computed by an independent brute-force oracle in `scripts/phase4_oracles.py`, which enumerates every pair or triple and shares no logic with the reference solutions. `scripts/verify_content.py` then checks each reference solution against all of those cases. The oracle also enforces the pair-sum contract that at most one index pair reaches the target; it caught two ambiguous hand-written cases during authoring, which were then fixed.

## Visualizer

`two-pointers` (`src/lib/viz/two-pointers.ts`) is a deterministic tracer with two modes:

- **Opposite-direction pair sum.** It shades positions outside `[lo, hi]` as ruled out, explains each move by the invariant, and counts sums and moves. Input must be sorted; the parser refuses unsorted input and the player offers to sort it.
- **Same-direction deduplication.** It shows the kept prefix, the read position and the overwritten leftovers, and counts reads and writes.

Unit tests compare both modes with brute force on hundreds of generated inputs. They check that no index belonging to a valid pair is ever ruled out, that moves never exceed n - 1, that reads equal n - 1, that write never passes read, and that snapshots are detached.

## Verification

From `feature/dsa-academy-phase-4`, against the isolated stack (`scripts/regression-env.mjs`):

| Check | Result |
| --- | --- |
| `tests/unit/two-pointers-viz.test.ts` | 5 passed |
| Two Pointers cases in `tests/unit/phase4-content.test.ts` | Passed |
| `python3 -I scripts/phase4_oracles.py --check` | Passed (all 12 problems) |
| `tests/e2e/two-pointers.spec.ts` | 3 passed: six lessons run their Python and persist completion; the visualizer runs both modes, refuses unsorted input and offers to sort; all six problems pass their visible samples in Pyodide, save drafts, record self-review submissions and release editorials only after submission; the quiz grades 100 percent and the project submission persists |
| Two Pointers accessibility | 7 passed (6 shared visualizer checks plus the Mode control) |

The browser suite copies the draft into a temporary published module for a temporary student, removes both by exact ID, and checks that existing modules and student activity hash identically afterwards. The real module stays unpublished; the fixture asserts this before and after.

## Status

This is an unpublished draft. Publication needs a separate review and approval.

# Sliding Window verification checkpoint

DSA Module 6, `sliding-window`, is authored, integrated and browser-verified as an **unpublished draft**. It keeps its existing slug, title, description, phase and global position 8, and still lists `two-pointers` among its prerequisites. Students see it as planned. Its content was synced only to the isolated regression stack.

## Lessons

| # | Slug | Title | Runnable blocks | Visualizer |
| --- | --- | --- | --- | --- |
| 1 | `sliding-window-fundamentals` | Sliding-window fundamentals | 1 | |
| 2 | `fixed-size-windows` | Fixed-size windows | 2 | `sliding-window`, mode `fixed` |
| 3 | `variable-size-windows` | Variable-size windows | 3 | `sliding-window`, mode `shortest` |
| 4 | `frequency-maps-and-character-constraints` | Frequency maps and character constraints | 3 | `sliding-window`, mode `longest-distinct` |
| 5 | `advanced-windows-and-monotonic-validity` | Advanced windows and monotonic validity | 3 | |
| 6 | `window-correctness-and-limitations` | Correctness, amortized analysis and limitations | 2 | |

The section standard and checks are the same as for Two Pointers. The lessons are explicit about which value signs each technique needs:

- **Fixed-size windows** work with any values.
- **Shortest window with sum at least a target** and **longest window with sum at most a bound** need **nonnegative** values. Zeros are fine.
- **Counting windows whose product is below a bound** needs **strictly positive** values. A zero cannot be divided out, and a negative value flips the ordering.
- **Arbitrary integers** use prefix sums with a dictionary for exact sums, and a monotonic queue over prefix sums for the shortest window.

Lesson 3 includes executable counterexamples where the plain window returns wrong answers on negative input: `[4, -5, 3, 3]` with target 6, and `[4, -3, 2]` with bound 3. Lesson 6 solves both correctly with prefix sums.

## Assessment and project

- **Quiz `sliding-window-quiz`:** 10 questions using all four types, with a 70 percent pass mark. Two questions test the sign requirements. The numeric answers (shortest length 2, and 7 windows with exactly 2 distinct values) are recomputed by brute force in unit tests.
- **Project `streaming-window-analytics`:** 100-point rubric (implementation and incremental updates 30, validity and value requirements 25, testing and differential checks 25, analysis and communication 20), with eight requirements, including handling negative readings.

## Coding problems

| Slug | Title | Difficulty | Function | Samples | Hidden |
| --- | --- | --- | --- | --- | --- |
| `best-window-sum` | Best sum of k consecutive values | warm-up | `best_window_sum(values, k)` | 3 | 26 |
| `shortest-reaching-sum` | Shortest run reaching a target | core | `shortest_reaching_sum(values, target)` | 3 | 26 |
| `longest-distinct-run` | Longest run without a repeated character | core | `longest_distinct_run(text)` | 3 | 25 |
| `permutation-in-text` | Rearrangement inside a text | core | `contains_permutation(pattern, text)` | 3 | 26 |
| `smallest-covering-window` | Smallest window covering a pattern | challenge | `smallest_covering_window(text, pattern)` | 3 | 26 |
| `longest-run-after-replacements` | Longest uniform run after replacements | challenge | `longest_run_after_replacements(text, k)` | 3 | 26 |

These cover the brief's six problems with original statements and contracts:

- The shortest-sum problem guarantees positive values.
- The covering window respects multiplicity and returns the leftmost of the shortest windows.
- The fixed window allows negative values.

Expected values come from brute-force oracles that examine every window directly.

## Visualizer

`sliding-window` (`src/lib/viz/sliding-window.ts`) has three modes. Each shows the window boundaries `left` and `right`, the entering and leaving cells, whether the window is valid, the best window so far, and entry and exit counters that support the amortised argument:

- **Fixed window, best sum of k.** The k parameter is labelled "Window size k" and must lie between 1 and the list length. Negative values are accepted.
- **Shortest window with sum at least the target.** It refuses negative values with an explanation of why contraction would become unsafe.
- **Longest window with no repeated value.** It shows the frequency map at every step.

Unit tests compare all three modes with brute force on hundreds of inputs. They check that the frequency map matches the actual window at every step, that additions equal n and removals equal n - k for fixed windows, that each index enters once and leaves at most once, and that every precondition is enforced.

## Verification

| Check | Result |
| --- | --- |
| `tests/unit/sliding-window-viz.test.ts` | 5 passed |
| Sliding Window cases in `tests/unit/phase4-content.test.ts` | Passed |
| `tests/e2e/sliding-window.spec.ts` | 3 passed: six lessons, all three visualizer modes with their precondition errors (k out of range, negative values) and the frequency map, all six problems, the quiz at 100 percent and the project |
| Sliding Window accessibility | 7 passed |

The fixture approach and data-safety checks are the same as for Two Pointers.

## Status

This is an unpublished draft. Publication needs a separate review and approval.

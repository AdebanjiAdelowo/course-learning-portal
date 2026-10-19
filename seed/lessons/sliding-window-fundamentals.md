## Learning objectives

Recognise problems about contiguous subarrays or substrings that a sliding window can solve, describe a window by its boundaries and a summary that can be updated incrementally, distinguish fixed-size from variable-size windows, and state the conditions a problem must meet before a window is safe to use. Prerequisites: the Two Pointers module, especially same-direction pointers and the move-counting argument.

## Contiguous ranges and their summaries

A **window** is a contiguous range `A[left..right]` of a list or string. Many questions ask for the best window: the largest sum of `k` consecutive values, the shortest stretch whose total reaches a target, the longest substring without a repeated character. A list of length $n$ has $n(n+1)/2$ non-empty windows, so examining each one separately and summing it costs $\Theta(n^3)$ time, or $\Theta(n^2)$ with prefix sums.

A sliding window keeps one current window and a **summary** of it: a running sum, a count of each character, the number of required characters still missing. When the window moves, the summary is updated using only the values that enter or leave, instead of being recomputed. Both boundaries only ever move to the right, which is the same-direction pointer layout from the previous module, applied to a range instead of a prefix.

## Two kinds of windows

- **Fixed-size windows** always contain exactly `k` values. Each step adds one value on the right and removes one on the left. Questions: best sum of `k` consecutive values, averages of every block of `k`, whether some block of `k` letters is a rearrangement of a pattern.
- **Variable-size windows** grow on the right and shrink on the left according to a **validity** condition. Questions: shortest window that reaches a target, longest window that stays within a limit, smallest window that covers a set of characters.

```python-run
def window_averages(values, k):
    """Average of every block of k consecutive values, using a running sum."""
    if k <= 0 or k > len(values):
        return []
    running = sum(values[:k])
    out = [running / k]
    for right in range(k, len(values)):
        running += values[right] - values[right - k]
        out.append(running / k)
    return out

def window_averages_brute(values, k):
    if k <= 0 or k > len(values):
        return []
    return [sum(values[i:i + k]) / k for i in range(len(values) - k + 1)]

data = [4, 8, 6, -2, 10, 0]
assert window_averages(data, 3) == window_averages_brute(data, 3) == [6.0, 4.0, 14 / 3, 8 / 3]
assert window_averages(data, 6) == [26 / 6]
assert window_averages(data, 7) == []
print(window_averages(data, 3))
```

The averages are compared exactly here because every running sum is an integer and each division happens once. Summing floating-point values incrementally can accumulate rounding error, so for real-valued data compare with a tolerance.

## Worked example

Averages of blocks of 3 in `[4, 8, 6, -2, 10, 0]`. The first window `[4, 8, 6]` sums to 18, average 6. Slide: add -2, remove 4, sum 12, average 4. Slide: add 10, remove 8, sum 14, average 14/3. Slide: add 0, remove 6, sum 8, average 8/3. Four windows, and after the first one each costs one addition and one subtraction.

## When a window is safe

A sliding window is a candidate when three things hold.

1. **Contiguity.** The answer is a contiguous range. A question about any subset, such as "choose values with the largest sum", is not a window question.
2. **Incremental summary.** Adding or removing one value updates the summary in constant time, or in time bounded by a small alphabet. Sums, counts and frequency maps work. The median of the window does not, without extra data structures.
3. **Predictable validity**, for variable windows. If a window is valid, then shrinking it keeps it valid (for "longest" questions), or growing it keeps it valid (for "shortest" questions). This **monotonicity** is what lets one boundary move only forwards. For sums it usually requires **nonnegative values**: adding a nonnegative value never lowers a sum, and removing one never raises it. With negative values, a window that fails can become valid again by adding more values, and the shrinking rule loses solutions.

## Correctness

For the fixed-size averages, the invariant before handling position `right` is: `running` equals the sum of `values[right - k : right]`, the current window, and `out` holds the averages of every earlier window in order. Adding `values[right]` and subtracting `values[right - k]` moves the window one place without changing its length, so the invariant holds for the next position. Every window of length `k` starts at exactly one index from 0 to $n - k$, so all of them are produced.

## Complexity

The first window costs $k$ additions and each of the other $n - k$ windows costs two arithmetic steps, so the time is $\Theta(n)$, compared with $\Theta(nk)$ for summing each window from scratch. Extra space is $O(1)$ besides the output list. For variable windows the next lessons show the same linear bound with an amortised argument: each position enters the window once and leaves at most once.

## Common mistakes

- Treating a subsequence question as a window question. "Longest increasing subsequence" is not contiguous.
- Recomputing `sum(values[left:right + 1])` inside the loop, which silently restores quadratic time.
- Off-by-one window bounds: a window `[left, right]` has length `right - left + 1`, while a half-open window `[left, right)` has length `right - left`. Pick one convention and keep it.
- Using a shrinking rule on sums when the values can be negative.

## Practice exercises

1. Write `window_maxima_brute(values, k)` and explain why a running maximum cannot be updated by "removing" the leaving value the way a running sum can.
2. Decide whether each question is a window question: longest run of equal characters; two values with the largest product; shortest substring containing every vowel.
3. Change `window_averages` to report the starting index of the block with the largest average. Do you need to divide at all?
4. Find a list with a negative value where "longest window with sum at most 5", solved by shrinking whenever the sum exceeds 5, gives the wrong answer.

The next lesson develops fixed-size windows fully, including windows over letter counts.

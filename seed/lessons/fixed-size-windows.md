## Learning objectives

Maintain a fixed-size window with a running sum or a table of counts, find the best window of length `k`, list every position where a rearrangement of a pattern occurs, and explain why fixed windows work with negative values. Prerequisites: the window vocabulary of the previous lesson.

## The running sum

For the largest sum of `k` consecutive values, keep the sum of the current window. Moving the window one place right changes it by exactly two values: the one that enters and the one that leaves. The visualization shows the window, the values entering and leaving, and the best window found so far. Try a list with negative values: nothing about the method changes.

```viz
algorithm: sliding-window
mode: fixed
input: 2, 1, 5, 1, 3, 2, -4, 6
target: 3
```

```python-run
def best_window_sum(values, k):
    window = sum(values[:k])
    best, best_start = window, 0
    for right in range(k, len(values)):
        window += values[right] - values[right - k]
        if window > best:
            best, best_start = window, right - k + 1
    return best, best_start

def best_window_brute(values, k):
    sums = [sum(values[i:i + k]) for i in range(len(values) - k + 1)]
    best = max(sums)
    return best, sums.index(best)

data = [2, 1, 5, 1, 3, 2, -4, 6]
assert best_window_sum(data, 3) == (9, 2)            # [5, 1, 3]
assert best_window_sum([-4, -2, -7], 2) == (-6, 0)   # all negative: start from the first window, not 0
for k in range(1, len(data) + 1):
    assert best_window_sum(data, k) == best_window_brute(data, k)
print(best_window_sum(data, 3))
```

Strict comparison `window > best` keeps the **first** best window when several share the largest sum. A contract that asks for the last one would use `>=`.

## Windows over counts

To find every position where some rearrangement of a pattern appears in a text, notice that a rearrangement has exactly as many letters as the pattern. So only windows of length `len(pattern)` can match: a fixed window again. Its summary is a table of letter counts, and two strings are rearrangements of each other exactly when their count tables are equal.

```python-run
from collections import Counter

def rearrangement_starts(pattern, text):
    m = len(pattern)
    if m == 0 or m > len(text):
        return []
    need = Counter(pattern)
    have = Counter(text[:m])
    starts = [0] if have == need else []
    for right in range(m, len(text)):
        have[text[right]] += 1
        leaving = text[right - m]
        have[leaving] -= 1
        if have[leaving] == 0:
            del have[leaving]       # keep zero counts out so equality compares only present letters
        if have == need:
            starts.append(right - m + 1)
    return starts

def rearrangement_starts_brute(pattern, text):
    m = len(pattern)
    return [i for i in range(len(text) - m + 1) if m and sorted(text[i:i + m]) == sorted(pattern)]

assert rearrangement_starts("ab", "abxbaab") == [0, 3, 5]
assert rearrangement_starts("aab", "baabaa") == [0, 1, 2, 3]
assert rearrangement_starts("abc", "ab") == []
for pattern, text in (("ab", "eidbaooo"), ("a", "aaa"), ("xyz", "zyxzyx"), ("aa", "abab")):
    assert rearrangement_starts(pattern, text) == rearrangement_starts_brute(pattern, text)
```

Deleting a key whose count reaches zero matters: in recent Python versions `Counter` equality already ignores zero counts, but deleting them keeps the comparison correct in every version and keeps the table small.

## Worked example

Find the rearrangements of `"ab"` in `"abxbaab"`, whose letters at positions 0 to 6 are a, b, x, b, a, a, b. There are six windows of length 2, starting at 0 to 5: `"ab"`, `"bx"`, `"xb"`, `"ba"`, `"aa"` and `"ab"`. Moving from one to the next adds one count and removes one. The table equals `{a: 1, b: 1}` for the windows starting at 0, 3 and 5, so the answer is `[0, 3, 5]`. The window `"aa"` at 4 has the right length but the wrong counts.

Expected answers like this one are easy to get wrong by eye, which is why every example above is also compared with a brute-force version that sorts each window.

## Correctness

Invariant before handling position `right`: the summary (the sum, or the table `have`) describes exactly the window `text[right - m : right]`, and every earlier window has been checked. Adding the entering value and removing the leaving value turns the summary of one window into the summary of the next, because the two windows differ only in those two positions. Each start index from 0 to $n - m$ is checked once.

Negative values cause no trouble, because no decision depends on the window's sum: the length is fixed, so there is never a choice about when to grow or shrink.

## Complexity

The running sum uses $\Theta(n)$ time and $O(1)$ space. The rearrangement search does $O(1)$ table updates per step plus a comparison of two tables with at most $\sigma$ keys, where $\sigma$ is the alphabet size: $O(n\sigma)$ time and $O(\sigma)$ space, linear for a fixed alphabet. Keeping a counter of how many letters currently have the right count removes the comparison and gives $\Theta(n)$ for any alphabet.

## Common mistakes

- Initialising `best` to 0, which is wrong when every window sum is negative.
- Comparing windows of the wrong length: the first full window ends at index `k - 1`.
- Leaving zero counts in a plain dictionary and then comparing it with the pattern's table.
- Writing expected answers without checking them against a brute-force version, as the worked example shows.

## Practice exercises

1. Return the starting index of every window of length `k` whose sum equals a target.
2. Rewrite `rearrangement_starts` with a single integer `matches` that counts letters whose window count equals the pattern count, and update it in constant time per step.
3. Explain why the maximum of each window cannot be maintained with one variable, and look ahead to the monotonic queue in the fifth lesson.
4. For text length $n$ and pattern length $m$, how many windows are checked? What happens when $m > n$?

The next lesson lets the window change size, which needs a validity rule and, for sums, nonnegative values.

## Approach and correctness

A window can become one repeated letter with at most `k` changes exactly when `length - (count of its most frequent letter) <= k`: keep the most frequent letter and replace everything else. If a window is valid, every window inside it is valid too, because removing a character lowers the length by one and the top count by at most one. So for each `right`, the longest valid window ending there is found by shrinking from the left until the condition holds, and the best length over all `right` is the answer.

## Complexity

`right` moves `n` times and `left` at most `n` times. Recomputing `max(counts)` scans 26 entries, so the time is O(26n), which is Theta(n) for this alphabet, with O(1) space. A well-known refinement keeps a non-decreasing record of the top count and never shrinks the window more than one step at a time; it is faster by a constant factor but its correctness argument is subtler.

## Boundaries

The empty string returns 0. With `k >= len(text)` the whole string qualifies. With `k == 0` the answer is the longest run of one letter already present.

## Reference implementation

```python
def longest_run_after_replacements(text, k):
    counts = [0] * 26
    left = 0
    best = 0
    for right, ch in enumerate(text):
        counts[ord(ch) - 65] += 1
        while (right - left + 1) - max(counts) > k:
            counts[ord(text[left]) - 65] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

assert longest_run_after_replacements("ABAB", 2) == 4
assert longest_run_after_replacements("AABABBA", 1) == 4
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

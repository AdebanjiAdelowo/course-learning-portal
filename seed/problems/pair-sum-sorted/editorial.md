## Approach and correctness

Start with `lo` at the first position and `hi` at the last. Invariant: no valid pair uses a position outside `[lo, hi]`. If `values[lo] + values[hi]` is below the target, then `values[lo]` plus any remaining value is at most that sum, because `values[hi]` is the largest remaining value. So `lo` belongs to no valid pair and can be discarded. The symmetric argument discards `hi` when the sum is too large. Each step keeps the invariant, so when the pointers meet every pair has been ruled out.

## Complexity

Each iteration moves exactly one pointer inwards, and the gap `hi - lo` starts at `n - 1`, so there are at most `n - 1` iterations: Theta(n) time in the worst case and O(1) auxiliary space. The sorted precondition is what makes the discarding argument valid; on unsorted input the method is wrong, not merely slow.

## Boundaries

An empty or single-element list has no pair. Equal values are fine: `[2, 2]` with target 4 returns `[0, 1]`. Negative values and targets need no special handling. The loop condition is `lo < hi`, not `lo <= hi`, because a position cannot pair with itself.

## Reference implementation

```python
def pair_sum_sorted(values, target):
    lo, hi = 0, len(values) - 1
    while lo < hi:
        total = values[lo] + values[hi]
        if total == target:
            return [lo, hi]
        if total < target:
            lo += 1
        else:
            hi -= 1
    return []

assert pair_sum_sorted([1, 3, 4, 6, 9], 12) == [1, 4]
assert pair_sum_sorted([], 3) == []
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

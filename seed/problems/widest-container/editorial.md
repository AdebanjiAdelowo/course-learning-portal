## Approach and correctness

Start with the widest pair, positions `0` and `n - 1`. Suppose `heights[lo] <= heights[hi]`. Every other pair that uses `lo` has a smaller width and is still limited by `heights[lo]` at best, so none of them can beat the current pair. Therefore `lo` can be discarded after recording the current capacity. The symmetric argument applies to `hi`. Invariant: the best capacity of any pair with a position outside `[lo, hi]` has already been recorded in `best`. When the pointers meet, all pairs have been accounted for.

## Complexity

One pointer moves per iteration: at most `n - 1` iterations, Theta(n) time and O(1) auxiliary space, against Theta(n^2) pairs for the direct search.

## Boundaries

Empty and single-wall lists return 0. Zero-height walls hold nothing. When the two heights are equal, moving either pointer is safe, because every pair using either wall is bounded by the current capacity. Width is `hi - lo`, not `hi - lo + 1`.

## Reference implementation

```python
def max_container_area(heights):
    lo, hi = 0, len(heights) - 1
    best = 0
    while lo < hi:
        best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
        if heights[lo] <= heights[hi]:
            lo += 1
        else:
            hi -= 1
    return best

assert max_container_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
assert max_container_area([5]) == 0
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

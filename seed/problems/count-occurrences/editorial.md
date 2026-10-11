## Idea

In a sorted list, all copies of the target are adjacent. They occupy a block that starts at the first index holding a value of at least the target, and ends just before the first index holding a value **greater** than the target. The count is the difference of those two boundaries.

Both boundaries are found by the same boundary search, with a different test.

## Solution

```python
def count_occurrences(items: list[int], target: int) -> int:
    def boundary(strict: bool) -> int:
        # First index whose value is > target (strict) or >= target (not strict).
        lo, hi = 0, len(items)
        while lo < hi:
            mid = (lo + hi) // 2
            below = items[mid] <= target if strict else items[mid] < target
            if below:
                lo = mid + 1
            else:
                hi = mid
        return lo

    return boundary(strict=True) - boundary(strict=False)


assert count_occurrences([1, 3, 3, 3, 5], 3) == 3
assert count_occurrences([1, 3, 3, 3, 5], 4) == 0
assert count_occurrences([], 1) == 0
```

## Why it is correct

Let $L$ be the smallest index with `items[L] >= target` and $U$ the smallest index with `items[U] > target`, each taken to be $n$ if no such index exists. The correctness of each boundary search is the argument given for **Lower bound**, with the test replaced.

By sortedness, the indices $i$ with `items[i] == target` are exactly those with $L \le i < U$: below $L$ the values are too small, and from $U$ on they are too large. There are $U - L$ such indices. When the target is absent, $L = U$ and the count is 0.

## Complexity

Two binary searches: $\Theta(\log n)$ time and $\Theta(1)$ extra space, independent of how many copies there are. A scan from the first match would take $\Theta(\log n + k)$ for $k$ copies, which is $\Theta(n)$ when the whole list is one value.

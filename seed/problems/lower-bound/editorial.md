## Idea

The answer is a boundary. Every index to its left holds a value smaller than the target and every index from it onward holds a value at least the target. Binary search can find a boundary directly, without ever testing for equality.

Use a half-open candidate range for the **answer**: it lies in $[lo, hi]$ with $lo = 0$ and $hi = n$. Note that $hi$ starts at $n$, not $n - 1$, because $n$ is a possible answer.

## Solution

```python
def lower_bound(items: list[int], target: int) -> int:
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo


assert lower_bound([1, 3, 3, 5, 8], 3) == 1
assert lower_bound([1, 3, 3, 5, 8], 4) == 3
assert lower_bound([1, 3, 3, 5, 8], 9) == 5
assert lower_bound([], 7) == 0
```

## Why it is correct

**Invariant.** Every index below $lo$ holds a value smaller than the target, and every index from $hi$ upward holds a value at least the target.

Both parts are true of empty ranges at the start. In an iteration, $lo \le mid < hi$, so `items[mid]` is a valid element.

- If `items[mid] < target`, sortedness gives that every index up to $mid$ is smaller than the target, so $lo = mid + 1$ keeps the first part true.
- Otherwise `items[mid] >= target`, and sortedness gives that every index from $mid$ upward is at least the target, so $hi = mid$ keeps the second part true.

The loop ends with $lo = hi$. The invariant then says everything below $lo$ is too small and everything from $lo$ upward is large enough, which is exactly the definition of the answer.

**Termination.** Because $mid < hi$, the assignment $hi = mid$ strictly shrinks the range, and so does $lo = mid + 1$. This is why $hi = mid$ is safe here although it would loop for ever in the closed-range version from the lesson, where the loop condition is `lo <= hi`.

## Complexity

The range size $hi - lo$ at least halves each iteration, so there are at most $\lfloor \log_2 n \rfloor + 1$ iterations: $\Theta(\log n)$ time and $\Theta(1)$ extra space.

This function is `bisect.bisect_left` from the standard library.

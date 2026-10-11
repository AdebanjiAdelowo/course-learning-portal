## Idea

A list is in non-decreasing order exactly when every **adjacent** pair is in order. It is not necessary to compare every pair of positions: order between neighbours implies order between any two positions, because $\le$ is transitive.

## Solution

```python
def is_sorted(items: list[int]) -> bool:
    for i in range(1, len(items)):
        if items[i - 1] > items[i]:
            return False
    return True


assert is_sorted([1, 2, 2, 5])
assert not is_sorted([1, 3, 2])
assert is_sorted([]) and is_sorted([4])
```

## Why it is correct

**Invariant.** At the start of iteration $i$, the prefix `items[0..i-1]` is in non-decreasing order.

The prefix of length 1 is sorted, which gives initialisation. If the prefix up to $i - 1$ is sorted and `items[i-1] <= items[i]`, then the prefix up to $i$ is sorted. If the loop finishes, the invariant with $i = n$ says the whole list is sorted. If the function returns `False`, it has found an adjacent pair out of order, which is a direct counterexample.

For $n \le 1$ the loop body never runs and the function returns `True`, as the problem requires.

## Complexity

At most $n - 1$ comparisons: $\Theta(n)$ time in the worst case, which occurs when the list is sorted, and $\Theta(1)$ in the best case, when the first pair is out of order. Extra space is $\Theta(1)$.

Sorting a copy and comparing would cost more than this and use $\Theta(n)$ extra space.

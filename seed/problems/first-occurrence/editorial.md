## Idea

Examine the positions from left to right and return at the first match. Scanning in increasing order of index is what makes the answer the *smallest* matching index.

## Solution

```python
def first_occurrence(items: list[int], target: int) -> int:
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1


assert first_occurrence([4, 2, 7, 2], 2) == 1
assert first_occurrence([], 5) == -1
```

## Why it is correct

**Invariant.** At the start of iteration $i$, the target does not occur at any index smaller than $i$.

It holds trivially for $i = 0$. If iteration $i$ does not return, then `items[i] != target`, so the statement holds for $i + 1$. When the function returns $i$, the invariant says no smaller index matches, so $i$ is the first occurrence. When the loop finishes, the invariant with $i = n$ says the target is absent, and $-1$ is correct.

## Complexity

At most $n$ comparisons, so the worst-case time is $\Theta(n)$, reached when the target is last or absent. The best case is $\Theta(1)$. Extra space is $\Theta(1)$.

No algorithm can do better in the worst case on unsorted input: if some position is never examined, the target could be there.

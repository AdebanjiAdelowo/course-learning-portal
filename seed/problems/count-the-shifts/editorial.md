## Idea

Run insertion sort on a copy and count. The lesson showed that each shift removes exactly one inversion, so the answer equals the number of pairs of positions $p < q$ with `items[p] > items[q]`. Either description gives a correct solution. The first is used here because it follows the algorithm you already know.

## Solution

```python
def count_shifts(items: list[int]) -> int:
    work = list(items)          # sort a copy, leaving the argument untouched
    shifts = 0
    for j in range(1, len(work)):
        key = work[j]
        i = j - 1
        while i >= 0 and work[i] > key:
            work[i + 1] = work[i]
            shifts += 1
            i -= 1
        work[i + 1] = key
    return shifts


original = [31, 12, 45, 8]
assert count_shifts(original) == 4
assert original == [31, 12, 45, 8]      # unchanged
assert count_shifts([1, 2, 3]) == 0
assert count_shifts([3, 2, 1]) == 3
```

## Why it is correct

The function performs insertion sort exactly as in the lesson and increments the counter once per execution of the shifting assignment, so it returns the number of shifts by construction. Copying the list first means the caller's list is not modified.

As a cross-check, the count must equal the number of inversions:

```python
def inversions(items: list[int]) -> int:
    n = len(items)
    return sum(1 for p in range(n) for q in range(p + 1, n) if items[p] > items[q])


for sample in ([], [5], [2, 1], [3, 1, 2], [2, 2, 1], [4, 3, 2, 1], [1, 3, 2, 3, 1]):
    assert count_shifts(sample) == inversions(sample)
```

Equal elements are never shifted past each other, because the test is `>` and not `>=`. They are not inversions either, so the two counts agree on lists with duplicates.

## Complexity

The number of shifts is at most $\frac{n(n-1)}{2}$, reached on a strictly decreasing list, so the time is $\Theta(n^2)$ in the worst case and $\Theta(n)$ on a sorted list. The copy uses $\Theta(n)$ extra space.

Counting inversions can be done in $\Theta(n \log n)$ time with a modified merge sort. That is a problem for the divide-and-conquer module.

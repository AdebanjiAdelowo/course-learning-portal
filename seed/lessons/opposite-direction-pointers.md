## Learning objectives

Search a sorted list for a pair with a given sum in linear time, prove with an invariant that each pointer move discards only positions that cannot be part of a solution, adapt the method to count or bound pairs, and recognise when the sorted precondition fails. Prerequisites: the opposite-direction skeleton and the move-counting argument from the previous lesson.

## The problem and the slow solution

Given a list sorted in non-decreasing order and a target, find positions `i < j` with `A[i] + A[j] == target`. Checking every pair works on any list but takes $\binom{n}{2} = \Theta(n^2)$ comparisons. A dictionary of values seen so far finds a pair in linear expected time on unsorted data, at the cost of $\Theta(n)$ extra space. On sorted data we can do better: linear time and constant extra space, using only comparisons.

## Discarding with order

Put `lo` at the smallest value and `hi` at the largest. Look at $s = A[lo] + A[hi]$.

- If $s = target$, we are done.
- If $s < target$, then $A[lo]$ is too small to pair with $A[hi]$. Every other remaining value is at most $A[hi]$, so $A[lo]$ is too small to pair with any of them. Position `lo` can be discarded.
- If $s > target$, the symmetric argument discards `hi`: $A[hi]$ plus the smallest remaining value is already too large.

The visualization below runs this search. Cells outside `[lo, hi]` are shaded as ruled out. Change the target or the list, and watch which positions each move eliminates.

```viz
algorithm: two-pointers
mode: opposite
input: 1, 3, 4, 6, 9, 11, 14
target: 13
```

```python-run
def pair_sum_sorted(values, target):
    lo, hi = 0, len(values) - 1
    while lo < hi:
        total = values[lo] + values[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1
        else:
            hi -= 1
    return None

data = [1, 3, 4, 6, 9, 11, 14]
assert pair_sum_sorted(data, 15) == (0, 6)   # 4 + 11 and 6 + 9 also reach 15; 1 + 14 is checked first
assert pair_sum_sorted(data, 13) == (2, 4)
assert pair_sum_sorted(data, 2) is None
assert pair_sum_sorted([], 5) is None
assert pair_sum_sorted([5, 5], 10) == (0, 1)
print(pair_sum_sorted(data, 15))
```

Note the first assertion. The list contains several pairs that reach 15: (1, 14), (4, 11) and (6, 9). The function returns the first pair the pointers meet. Problem statements must say which pair is wanted, or guarantee that only one exists, before an exact answer can be tested.

## Worked example

Search `[1, 3, 4, 6, 9, 11, 14]` for 15. Start with `lo = 0`, `hi = 6`: 1 + 14 = 15, a pair at once. Search the same list for 13 instead. 1 + 14 = 15 is too large, so discard 14 (`hi = 5`). 1 + 11 = 12 is too small, so discard 1 (`lo = 1`). 3 + 11 = 14 is too large (`hi = 4`). 3 + 9 = 12 is too small (`lo = 2`). 4 + 9 = 13: the pair `(2, 4)`. Five comparisons instead of the 21 a full pair search could need.

## Correctness

Invariant: **no pair that reaches the target uses a position outside `[lo, hi]`**. Initially nothing is outside, so the invariant holds. If $s < target$ we showed that `lo` pairs with no position in `[lo + 1, hi]`; together with the invariant, `lo` belongs to no solution at all, so moving it out keeps the invariant. The case $s > target$ is symmetric. If the loop ends without finding a pair, `[lo, hi]` contains at most one position, so it contains no pair, and by the invariant no pair exists anywhere.

The proof uses sortedness exactly once: to claim that $A[hi]$ is the largest remaining value and $A[lo]$ the smallest. Remove that and the method is wrong, not merely slower. On the unsorted list `[9, 1, 2]` with target 3, the first sum 9 + 2 = 11 is too large, so the search discards position 2, as if 9 were the smallest remaining value. Then 9 + 1 = 10 discards position 1, and the search reports no pair, although 1 + 2 = 3.

```python-run
def pair_sum_sorted(values, target):
    lo, hi = 0, len(values) - 1
    while lo < hi:
        total = values[lo] + values[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1
        else:
            hi -= 1
    return None

def has_pair_brute(values, target):
    return any(values[i] + values[j] == target for i in range(len(values)) for j in range(i + 1, len(values)))

unsorted = [9, 1, 2]
assert has_pair_brute(unsorted, 3)
assert pair_sum_sorted(unsorted, 3) is None          # wrong answer on unsorted input
assert pair_sum_sorted(sorted(unsorted), 3) == (0, 1)  # positions refer to the sorted copy
```

The safe rule is simple: sort first, remembering that positions then refer to the sorted copy, or use a different method such as a dictionary of seen values.

## Counting instead of finding

The same discarding argument counts pairs with sum at most a bound. If $A[lo] + A[hi] \le bound$, then $A[lo]$ pairs successfully with every position from `lo + 1` to `hi`, because those values are no larger than $A[hi]$. Add `hi - lo` to the count and advance `lo`. Otherwise discard `hi`.

```python-run
def count_pairs_at_most(values, bound):
    lo, hi = 0, len(values) - 1
    count = 0
    while lo < hi:
        if values[lo] + values[hi] <= bound:
            count += hi - lo
            lo += 1
        else:
            hi -= 1
    return count

def count_pairs_brute(values, bound):
    n = len(values)
    return sum(1 for i in range(n) for j in range(i + 1, n) if values[i] + values[j] <= bound)

for case in ([1, 2, 3, 4, 5], [-3, -1, 0, 2, 2, 8], [], [7]):
    for bound in range(-6, 12):
        assert count_pairs_at_most(case, bound) == count_pairs_brute(case, bound)
print("counting agrees with the brute-force count")
```

## Complexity

Each iteration discards one position, so there are at most $n - 1$ iterations: $\Theta(n)$ time in the worst case and $O(1)$ auxiliary space. If the input is not already sorted, sorting first costs $O(n \log n)$, which then dominates. The counting version is also linear even though it adds up to $\Theta(n^2)$ pairs, because it adds each batch with one arithmetic step.

## Common mistakes

- Running the search on unsorted input. The answer may look right on small tests and fail on others.
- Returning values when the contract asks for positions, or one-based positions when it asks for zero-based ones.
- Moving `lo` when the sum is too large. Draw the two cases and say which value is "too small for everything" before writing the branch.
- Assuming a unique answer when the input allows several pairs.

## Practice exercises

1. Trace the search for 20 in `[1, 3, 4, 6, 9, 11, 14]`. Which positions are discarded, in order?
2. Modify the search to return the pair whose sum is closest to the target. What should happen when two sums are equally close?
3. Prove that `count_pairs_at_most` is correct by stating its invariant in the same style as the pair search.
4. A list is sorted in non-increasing order. What changes in the algorithm?

Next, the same-direction layout: a slow and a fast index that rewrite a list in place.

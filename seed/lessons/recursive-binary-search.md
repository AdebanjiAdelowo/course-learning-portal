## 1. Motivation and intuition

Linear search examines candidates individually. Sorted input permits a stronger inference: if the middle value is too small, no earlier value can match. Recursion expresses that reduction as a call on a smaller interval. Its proof combines the binary-search invariant from DSA Module 1 with induction on interval length.

This algorithm is useful for studying recursive decomposition, not as a reason to replace Python's library search routines. Recursion adds stack frames; the iterative version already achieves the same comparison count with less auxiliary frame memory.

## 2. Formal contract and prerequisites

Input: a sequence of integers sorted in non-decreasing order, a target, and valid bounds `0 <= lo <= hi <= len(items)`. Output: an index of the target in `[lo, hi)`, or -1 when it is absent there. Duplicate targets permit any matching index. Finding the *first* occurrence requires a different boundary-search contract.

Use half-open intervals consistently. The empty interval is `lo == hi`; no index exists to inspect there. A singleton interval has `hi - lo == 1`.

## 3. Pseudocode

```text
SEARCH(A, x, lo, hi)
    if lo = hi: return -1
    mid = floor((lo + hi) / 2)
    if A[mid] = x: return mid
    if A[mid] < x: return SEARCH(A, x, mid + 1, hi)
    return SEARCH(A, x, lo, mid)
```

Only one recursive branch is evaluated. Describing it as two recursive calls and assigning the recurrence of merge sort would be an error.

## 4. Python implementation

```python
def recursive_search(items, target, lo=0, hi=None):
    if hi is None:
        hi = len(items)
    if lo == hi:
        return -1
    mid = (lo + hi) // 2
    if items[mid] == target:
        return mid
    if items[mid] < target:
        return recursive_search(items, target, mid + 1, hi)
    return recursive_search(items, target, lo, mid)


assert recursive_search([], 7) == -1
assert recursive_search([7], 7) == 0
assert recursive_search([7], 8) == -1
assert recursive_search([1, 3, 5, 7, 9], 7) == 3
assert recursive_search([1, 3, 5, 7, 9], 4) == -1
```

No slices are created. `items` is shared by reference and only the bounds change.

## 5. Worked trace

Search for 9 in `[1,3,5,7,9,11]`. Bounds `[0,6)` give midpoint 3 and value 7. Recurse on `[4,6)`, midpoint 5 and value 11. Recurse on `[4,5)`, midpoint 4 and value 9. Return 4 through the two suspended callers.

The return statement must propagate the child's answer. Omitting `return` produces `None` in a parent even if the child found a valid index.

```python-run
def search_trace(items, target, lo, hi):
    print("bounds", lo, hi)
    if lo == hi:
        return -1
    mid = (lo + hi) // 2
    print("inspect", mid, items[mid])
    if items[mid] == target:
        return mid
    if items[mid] < target:
        return search_trace(items, target, mid + 1, hi)
    return search_trace(items, target, lo, mid)


print("index", search_trace([1, 3, 5, 7, 9, 11], 9, 0, 6))
```

## 6. Correctness

Induct on interval length. The empty interval correctly returns -1. For a non-empty interval, midpoint belongs to it. Equality returns a valid index. When the middle value is smaller than the target, sortedness proves every index at or below the midpoint is impossible. The target, if present, therefore lies in the right child. The left case is symmetric. Both children are shorter valid intervals, so the inductive hypothesis proves their answer correct. Returning that answer completes the argument.

Termination follows from strict decrease of interval length. Neither child includes the midpoint. Recursing on `[mid, hi)` in the too-small case could leave a singleton interval unchanged.

## 7. Complexity

Each non-base call performs constant work and reduces candidates by approximately half: `T(n) = T(floor(n/2)) + O(1)`. The worst-case time is logarithmic for positive `n`, more uniformly `O(log(n+1))` including empty input. Best-case time is constant when the first midpoint matches. Stack frames are logarithmic in the worst case, whereas iterative binary search uses constant auxiliary variable slots.

Creating slices would copy a geometric sequence of lengths, adding linear work overall along one search path. It would invalidate the constant-work recurrence stated above.

## 8. Edge cases and practice

Empty input, singleton input, duplicates, absence below the minimum, absence above the maximum and absence between values all deserve tests. Unsorted input violates the precondition; do not interpret its answer as a correct search result.

1. Trace an absent target in a length-seven list.
2. State which indices are excluded after each comparison.
3. Explain why this code is not necessarily a first-occurrence finder.
4. Compare recursion depth with the number of candidates.

## 9. Summary

Recursive binary search makes exactly one smaller call at each level. Sortedness justifies exclusion, induction justifies the smaller answer, and shrinking bounds justify termination. Return propagation and interval conventions are correctness concerns, not merely syntax preferences.

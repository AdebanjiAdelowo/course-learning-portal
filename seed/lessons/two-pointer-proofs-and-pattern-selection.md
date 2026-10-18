## Learning objectives

Write a correctness proof for any two-pointer algorithm using one template, prove linear running time by counting pointer moves, apply two pointers across two sorted lists, and choose between two pointers, hashing, binary search and a sliding window for a new problem. Prerequisites: every earlier lesson in this module.

## A proof template

Every algorithm in this module can be proved with the same four steps.

1. **Regions.** Say what each index marks and name the regions it creates: ruled out, finished, unread.
2. **Invariant.** State a claim about those regions that is true before every iteration. It must refer to the original input whenever positions are overwritten.
3. **Maintenance.** For each branch of the loop body, show that the claim still holds afterwards. This is where the problem's structure is used: sorted order, a monotone quantity, or an exchange argument.
4. **Termination and conclusion.** Show that the loop stops, and that the invariant plus the stopping condition give the required answer.

The pair search in a sorted list fills the template like this: regions are "outside `[lo, hi]`" and "inside"; the invariant is "no solution uses an outside position"; maintenance uses sorted order to discard one position; the loop stops when `lo >= hi`, and an interval of at most one position contains no pair.

## Two lists, two pointers

Two pointers can also walk two different sorted lists, one pointer each. Merging takes the smaller front value each time. Intersecting advances whichever pointer holds the smaller value, because that value cannot appear later in the other list.

```python-run
def merge_sorted(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out

def intersect_sorted(a, b):
    """Values present in both lists, each reported as often as it occurs in both."""
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] < b[j]:
            i += 1
        elif a[i] > b[j]:
            j += 1
        else:
            out.append(a[i]); i += 1; j += 1
    return out

assert merge_sorted([1, 4, 4, 9], [2, 4, 10]) == [1, 2, 4, 4, 4, 9, 10]
assert merge_sorted([], [3]) == [3]
assert intersect_sorted([1, 2, 2, 5, 7], [2, 2, 2, 7, 8]) == [2, 2, 7]
assert intersect_sorted([1, 3], [2, 4]) == []
from collections import Counter
for a, b in (([1, 1, 2, 3], [1, 2, 2]), ([0, 5, 5], [5, 5, 5]), ([], [1])):
    assert intersect_sorted(a, b) == sorted((Counter(a) & Counter(b)).elements())
print(merge_sorted([1, 4, 4, 9], [2, 4, 10]))
```

`merge_sorted` uses `<=` so that equal values from the first list come first, which makes the merge **stable**: the property merge sort relies on in a later module.

## Worked example

Intersect `[1, 2, 2, 5, 7]` and `[2, 2, 2, 7, 8]`. Compare 1 and 2: 1 is smaller and cannot occur later in the second list, so advance `i`. Compare 2 and 2: equal, record 2 and advance both. Again 2 and 2: record 2. Now 5 and 2: advance `j`. Then 5 and 7: advance `i`. Then 7 and 7: record 7. The first list is exhausted and the result is `[2, 2, 7]`.

## Correctness

For the intersection, the invariant before each comparison is: the output equals the multiset intersection of `a[0:i]` and `b[0:j]`, and every value in `a[0:i]` that is still unmatched is smaller than every value in `b[j:]`, and vice versa. When `a[i] < b[j]`, the value `a[i]` is smaller than everything from `b[j]` on, so it has no partner left and advancing `i` keeps the invariant. Equal fronts form one matched pair. When either list is exhausted, the remaining values of the other list have no possible partner.

## Complexity: counting moves, again

The merge and the intersection each advance at least one pointer per iteration, and the pointers make at most $|a| + |b|$ moves in total, so both run in $\Theta(|a| + |b|)$ time. The general rule: if every iteration moves some pointer forward, never backward, and the pointers' total travel is bounded by $T$, then the loop runs at most $T$ times. The same argument proves the linear bounds of every earlier lesson, and the sliding-window module will use it to show that a loop nested inside another can still be linear.

## Choosing a technique

Ask these questions about a new problem, in order.

- **Is the input sorted, or can it be sorted without breaking the question?** Pair and triplet sums, closest pairs, merging and intersection suggest **opposite-direction or two-list pointers**. If the answer must be positions in the original list, sorting a copy loses them unless you sort pairs of `(value, position)`.
- **Must the list be filtered or rearranged in place?** Use **same-direction pointers** with a read index and a write index.
- **Is the input unsorted, and is an expected linear time enough?** A **dictionary or set** finds a pair with a given sum in one pass with $\Theta(n)$ extra space, and keeps original positions.
- **Is the question about a contiguous range whose validity changes predictably as it grows or shrinks?** Use a **sliding window**, the next module.
- **Is there a monotone yes/no question over a range of answers?** Use **binary search**, from DSA Module 1.
- **Is the structure a sequence defined by a function or by links?** **Fast and slow pointers** detect cycles in constant space.

```python-run
def pair_with_sum_unsorted(values, target):
    """Hashing keeps original positions and needs no sort."""
    seen = {}
    for j, value in enumerate(values):
        if target - value in seen:
            return seen[target - value], j
        seen.setdefault(value, j)
    return None

assert pair_with_sum_unsorted([9, 1, 2], 3) == (1, 2)
assert pair_with_sum_unsorted([3, 3], 6) == (0, 1)
assert pair_with_sum_unsorted([1, 2], 7) is None
```

The hashing version answers the same question as the sorted search on unsorted data, but its extra space is linear, and it relies on hashing rather than comparisons.

## Common mistakes

- Using two pointers on data whose order does not support the discarding argument.
- Proving only that the output "looks right", without an invariant that covers every input.
- Forgetting the tail of the longer list after a merge loop ends.
- Claiming quadratic time because there are two indices: count the moves instead.

## Practice exercises

1. Fill in the four-step template for `dedupe_sorted_length` from the third lesson.
2. Write `difference_sorted(a, b)` that returns the values of `a` not in `b`, both sorted, in linear time.
3. For each of these, choose a technique and justify it: two values with a given product in a sorted list of positive integers; the longest stretch of days with total rainfall below a limit; whether a string is a rotation of another.
4. Give a loop with two pointers whose total travel is linear but which is still quadratic because each iteration does linear work. What does the move-counting rule assume?

This completes Two Pointers. The module project asks you to implement, test and compare these strategies on inputs you design.

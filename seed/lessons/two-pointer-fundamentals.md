## Learning objectives

By the end of this lesson you can describe a two-pointer algorithm as a pair of indices plus an invariant, write the loop condition and update rules for both pointer layouts, and bound the running time by counting pointer moves. Prerequisites: loops over lists, the read/write compaction pattern from the Arrays module, and proofs by loop invariant from DSA Module 1.

## What a two-pointer algorithm is

A two-pointer algorithm keeps two indices into the same sequence and moves them according to local comparisons. The indices split the sequence into regions, and each region has a meaning: positions already ruled out, positions already written, positions not yet examined. The algorithm is correct when every move preserves a statement about those regions. That statement is the loop invariant, and writing it down is the main skill this module teaches.

There are two common layouts. In the **opposite-direction** layout, one index starts at the left end and the other at the right end, and they move towards each other until they meet. In the **same-direction** layout, both indices start at the left and move rightwards; a fast index reads every position while a slow index marks a boundary, such as the end of a prefix that has already been processed.

Both layouts replace a search over all pairs, which takes $\Theta(n^2)$ comparisons, with a single scan. They can do so only when some structure tells us that a pointer's current position can never be useful again. In sorted data that structure is order. In compaction problems it is the fact that each position needs to be read only once.

## The skeleton of each layout

```text
OPPOSITE(A)                        SAME(A)
    lo = 0, hi = n - 1                 slow = 0
    while lo < hi                      for fast = 0 to n - 1
        inspect A[lo], A[hi]               if A[fast] should be kept
        move lo right or hi left               A[slow] = A[fast]
    report                                     slow = slow + 1
                                       report slow
```

Opposite-direction loops use `lo < hi` because each step needs two distinct positions. Same-direction loops usually run the fast index over every position exactly once.

```python-run
def reverse_in_place(items):
    """Opposite-direction layout: swap the two ends, then move both inwards."""
    lo, hi = 0, len(items) - 1
    while lo < hi:
        items[lo], items[hi] = items[hi], items[lo]
        lo += 1
        hi -= 1
    return items

def keep_even(items):
    """Same-direction layout: slow marks the end of the kept prefix."""
    slow = 0
    for fast in range(len(items)):
        if items[fast] % 2 == 0:
            items[slow] = items[fast]
            slow += 1
    return items[:slow]

assert reverse_in_place([1, 2, 3, 4, 5]) == [5, 4, 3, 2, 1]
assert reverse_in_place([]) == []
assert keep_even([3, 4, 7, 8, 10, 1]) == [4, 8, 10]
assert keep_even([1, 3]) == []
print("reverse and keep_even both pass")
```

## Worked example

Trace `reverse_in_place([1, 2, 3, 4, 5])`. Initially `lo = 0`, `hi = 4`. The first swap gives `[5, 2, 3, 4, 1]`, then `lo = 1`, `hi = 3`. The second swap gives `[5, 4, 3, 2, 1]`, then `lo = 2`, `hi = 2`. The loop stops because `lo < hi` is false, and the middle element is already where it belongs.

Trace `keep_even([3, 4, 7, 8, 10, 1])`. `fast` visits all six positions. `slow` stays at 0 while reading 3, then writes 4 at position 0, skips 7, writes 8 at position 1 and 10 at position 2, and skips 1. The kept prefix is `[4, 8, 10]` and `slow = 3`.

## Correctness

For `reverse_in_place`, the invariant before each iteration is: every position outside `[lo, hi]` already holds its final reversed value, and positions inside still hold their original values. A swap places the two boundary values at their final positions, then shrinking the interval restores the invariant. When `lo >= hi`, at most one position remains inside, and a single middle value is its own mirror image.

For `keep_even`, the invariant before reading position `fast` is: `items[0:slow]` holds, in order, the even values among the original `items[0:fast]`. Because `slow <= fast`, writing to `items[slow]` never destroys a value that has not been read. Termination is immediate for both loops: the opposite-direction gap shrinks by two per step, and the fast index ranges over a fixed sequence.

An invariant must say something about **original** values whenever positions get overwritten. Saying "the prefix is even" is true but too weak to prove the result, because it does not say that every even value was kept, or in which order.

## Complexity

Count pointer moves. In the opposite layout the gap `hi - lo` starts at $n - 1$ and every iteration reduces it by at least one, so there are at most $n - 1$ iterations. In the same layout the fast index makes exactly $n$ moves and the slow index at most $n$. Each iteration does constant work, so both run in $\Theta(n)$ time with $O(1)$ auxiliary space. Returning `items[:slow]` allocates a new list of the kept length; report that output space separately from the constant auxiliary space of the loop.

This "count the moves" argument is the standard way to prove linear time for every algorithm in this module, including ones whose inner loops look nested.

## Common mistakes

- Writing `while lo <= hi` in a pair search, so a position is paired with itself.
- Moving both pointers when the invariant only justifies discarding one position.
- Incrementing the slow pointer for a value that was skipped, which leaves stale values inside the kept prefix.
- Forgetting the empty list: `hi = -1` must not be used as an index.
- Stating an invariant about the mutated list only, which cannot prove that nothing was lost.

## Practice exercises

1. Adapt `keep_even` to keep values within a given closed range, and state its invariant.
2. Trace `reverse_in_place` on a list of length 6 and on a list of length 1. How many swaps happen in each case?
3. Write `is_reversed(a, b)` that checks whether `b` is `a` reversed, using one index moving forwards in `a` and one moving backwards in `b`. Which layout is this?
4. Give an input on which a version that moves both pointers on every comparison would be wrong for a pair-sum search, and say which pair it misses.

The next lesson turns the opposite-direction layout into a search on sorted data, where the invariant explains exactly which pairs a move rules out.

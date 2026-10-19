## Learning objectives

Use a slow and a fast index to rewrite a list in place, remove duplicates from sorted data, move a class of values to the end while keeping order, and prove that the slow index never overwrites a value the fast index still needs. Prerequisites: the same-direction skeleton from the first lesson and the compaction invariant from the Arrays module.

## Reading once, writing behind

In the same-direction layout, the fast index reads every position exactly once. The slow index marks the boundary of the part of the list that is finished: everything before `slow` is final output, everything from `slow` to `fast` is free space or leftovers, and everything from `fast` onwards is unread input. The algorithm is safe because `slow <= fast` at all times. A write always lands at or behind the read position, so it can only overwrite something already read.

This layout gives in-place versions of filtering problems that would otherwise build a new list. The contract usually says the first `k` positions hold the answer and returns `k`, leaving the rest of the list unspecified. Making that explicit avoids confusing the length of the answer with the length of the list.

## Removing duplicates from sorted data

In a sorted list every copy of a value sits next to the others. So a value is new exactly when it differs from the last value kept. The visualization shows the kept prefix, the read position and the overwritten leftovers.

```viz
algorithm: two-pointers
mode: same
input: 2, 2, 3, 5, 5, 5, 8, 9, 9
```

```python-run
def dedupe_sorted_length(values):
    """Keep one copy of each value at the front; return how many were kept."""
    if not values:
        return 0
    slow = 1
    for fast in range(1, len(values)):
        if values[fast] != values[slow - 1]:
            values[slow] = values[fast]
            slow += 1
    return slow

data = [2, 2, 3, 5, 5, 5, 8, 9, 9]
k = dedupe_sorted_length(data)
assert k == 5 and data[:k] == [2, 3, 5, 8, 9]
assert dedupe_sorted_length([]) == 0
single = [4, 4, 4]
assert dedupe_sorted_length(single) == 1 and single[0] == 4
print(k, data[:k], "leftovers:", data[k:])
```

The leftovers printed at the end are values the contract does not care about. A caller who needs a shorter list can truncate with `del data[k:]`, which is a separate decision.

## Keeping order while moving values to the end

To move every zero to the end while keeping the nonzero values in order, swap instead of copy. When `values[fast]` is nonzero, swapping it with `values[slow]` sends it to the end of the nonzero block and sends a zero into the gap. Swapping, rather than overwriting, keeps every original value somewhere in the list, so the zeros end up in the suffix without being counted.

```python-run
def zeros_to_end(values):
    slow = 0
    for fast in range(len(values)):
        if values[fast] != 0:
            values[slow], values[fast] = values[fast], values[slow]
            slow += 1
    return values

assert zeros_to_end([0, 3, 0, 5, 7]) == [3, 5, 7, 0, 0]
assert zeros_to_end([1, 2]) == [1, 2]
assert zeros_to_end([0, 0]) == [0, 0]
assert zeros_to_end([]) == []
```

## Worked example

Trace `dedupe_sorted_length([2, 2, 3, 5, 5, 5, 8, 9, 9])`. `slow = 1` because the first value is always kept. Reading 2 at position 1: equal to the last kept value, skip. Reading 3: new, write it at position 1, `slow = 2`. Reading 5: new, write at 2, `slow = 3`. The next two 5s are skipped. 8 is written at 3 and 9 at 4, giving `slow = 5`. The final 9 is skipped. The list is now `[2, 3, 5, 8, 9, 5, 8, 9, 9]`, and only the first five positions are meaningful.

## Correctness

Invariant for deduplication, before reading position `fast`: `values[0:slow]` holds each distinct value of the original `values[0:fast]` exactly once, in increasing order. Reading an equal value leaves the distinct set unchanged, because sortedness means it equals the most recent distinct value. Reading a different value adds exactly one new distinct value, which is larger than all kept values, so appending it at `slow` preserves order. Since `slow <= fast`, the position written was already read. At the end `fast = n`, so the prefix holds every distinct value of the whole list.

Invariant for moving zeros: `values[0:slow]` holds the nonzero values of the processed prefix in their original order, and `values[slow:fast]` holds only zeros. A nonzero value is swapped to the end of the first block and a zero moves to the end of the second; a zero simply extends the second block. When `slow == fast` the swap is with itself, which is harmless.

## Complexity

Both functions make one pass: the fast index moves $n$ times and the slow index at most $n$ times, with constant work per move. Time is $\Theta(n)$ and auxiliary space is $O(1)$. A version that calls `values.pop(i)` for each duplicate is correct but can take $\Theta(n^2)$ time, because each `pop` shifts the suffix.

## Common mistakes

- Comparing with `values[fast - 1]` instead of the last kept value. On sorted data the two agree, but the habit breaks on related problems such as "keep at most two copies".
- Starting `slow` at 0 for deduplication, which compares the first value with `values[-1]`, the last element of the list.
- Overwriting instead of swapping when the zeros must survive in the suffix.
- Removing items from a list while iterating over it with `for x in values`, which skips elements.

## Practice exercises

1. Generalise deduplication to keep at most two copies of each value. Which earlier position should you compare with?
2. Write `remove_value(values, x)` that keeps every value except `x`, in order, and returns the kept length.
3. Trace `zeros_to_end([0, 0, 1])` and record `slow`, `fast` and the list after every iteration.
4. Explain why the deduplication invariant needs the word "original".

The next lesson keeps two pointers moving in the same direction but at different speeds, which detects cycles and finds midpoints.

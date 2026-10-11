## Idea

Carry two values through one pass: the largest seen so far and the second largest distinct value seen so far. Each new element either becomes the new largest (pushing the old largest down to second place), or beats the current second, or changes nothing.

## Solution

```python
def second_largest(items: list[int]) -> int:
    largest = second = None
    for value in items:
        if largest is None or value > largest:
            largest, second = value, largest
        elif value != largest and (second is None or value > second):
            second = value
    return second


assert second_largest([4, 9, 2, 7]) == 7
assert second_largest([5, 5, 3]) == 3
assert second_largest([1, 2]) == 1
assert second_largest([-1, -5, -3]) == -3
```

## Why it is correct

**Invariant.** After each element has been processed, `largest` is the largest value seen so far, and `second` is the largest value seen so far that is strictly smaller than `largest`, or `None` if there is no such value yet.

Consider a new `value`.

- If it is greater than `largest`, it becomes the largest. The old largest is now the biggest value below the new one, so it becomes `second`.
- If it equals `largest`, nothing changes. This is the case that handles duplicates of the maximum, and the test `value != largest` is what guards it.
- If it is smaller than `largest` and greater than `second` (or there is no `second` yet), it is the new second largest.
- Otherwise it is too small to matter.

In every case the invariant still holds. After the last element it describes the whole list. The precondition guarantees at least two distinct values, so `second` is not `None`.

Starting from `None` rather than from 0 matters: a list of negative numbers would otherwise report 0, a value that is not in the list.

A check against sorting the distinct values, on every short list:

```python
from itertools import product

for length in range(2, 6):
    for values in product(range(-2, 3), repeat=length):
        if len(set(values)) >= 2:
            assert second_largest(list(values)) == sorted(set(values))[-2]
```

## Complexity

One pass with a constant amount of work per element: linear time, constant extra space. Sorting the distinct values gives the same answer in about n log n time with linear extra space.

## Common mistakes

- Initialising `largest` to 0, which fails on lists of negative numbers.
- Forgetting the test `value != largest`, so that `[5, 5, 3]` returns 5.
- Calling `items.sort()`, which changes the caller's list.

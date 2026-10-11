## Idea

Go through the list once. Keep a set of the values already met, and append a value to the result only when it is not yet in the set. The list keeps the order; the set answers "have I seen this?" quickly. Each structure does the job it is good at.

## Solution

```python
def remove_duplicates(items: list[int]) -> list[int]:
    result = []
    seen = set()
    for value in items:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


original = [3, 1, 3, 2, 1]
assert remove_duplicates(original) == [3, 1, 2]
assert original == [3, 1, 3, 2, 1]          # the argument is unchanged
assert remove_duplicates([]) == []
assert remove_duplicates([7, 7, 7]) == [7]
```

## Why it is correct

**Invariant.** After each element has been processed, `result` holds the distinct values met so far, each once, in order of first appearance, and `seen` is the set of exactly those values.

A new value that is not in `seen` is making its first appearance, so it is appended and recorded. A value already in `seen` appeared earlier and is already in `result`, so it is skipped. Either way the invariant holds, and after the last element it describes the whole list.

The function builds a new list and never assigns to `items`, so the caller's list is untouched.

A check against a slower method that is easy to believe, on every short list:

```python
from itertools import product


def remove_duplicates_slow(items):
    result = []
    for value in items:
        if value not in result:         # scans the result list: linear each time
            result.append(value)
    return result


for length in range(0, 6):
    for values in product(range(3), repeat=length):
        assert remove_duplicates(list(values)) == remove_duplicates_slow(list(values))
```

## Complexity

One pass, with a set lookup, a set insertion and a list append per element, each constant time on average: linear time overall. The extra space is linear, for the set and the result.

The slow version above is quadratic when most values are distinct, because `value not in result` scans a list that keeps growing. For 100,000 distinct values that is about five billion comparisons against 100,000 set lookups.

## Why not `list(set(items))`?

It removes duplicates in linear time but does not keep the order of first appearance, because a set has no order. The problem asks for the original order.

## Common mistakes

- Using `items.remove(...)` or otherwise editing `items`, which changes the caller's list.
- Testing membership in `result` instead of in `seen`.
- Adding to `seen` before testing, so that nothing is ever appended.

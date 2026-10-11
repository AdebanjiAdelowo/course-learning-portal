## Idea

Peel off the largest unit first. `total // 3600` is the number of whole hours, and `total % 3600` is what is left once those hours are removed. Apply the same step to the remainder with 60.

## Solution

```python
def split_duration(total_seconds: int) -> list[int]:
    hours = total_seconds // 3600
    remaining = total_seconds % 3600
    return [hours, remaining // 60, remaining % 60]


assert split_duration(3725) == [1, 2, 5]
assert split_duration(0) == [0, 0, 0]
assert split_duration(59) == [0, 0, 59]
assert split_duration(172800) == [48, 0, 0]
```

## Why it is correct

For integers with a positive divisor, Python guarantees `a == (a // b) * b + a % b` and `0 <= a % b < b`.

Applied with `b = 3600`: `total == hours * 3600 + remaining` and `0 <= remaining < 3600`. Applied to `remaining` with `b = 60`: `remaining == minutes * 60 + seconds` and `0 <= seconds < 60`. Because `remaining < 3600`, `minutes = remaining // 60` is less than 60.

Putting the two together, `total == hours * 3600 + minutes * 60 + seconds` with both bounds satisfied, which is exactly what was asked. The check below confirms that nothing is lost for every duration up to three hours:

```python
for total in range(0, 3 * 3600 + 1):
    hours, minutes, seconds = split_duration(total)
    assert hours * 3600 + minutes * 60 + seconds == total
    assert 0 <= minutes < 60 and 0 <= seconds < 60
```

## Complexity

A fixed number of arithmetic operations, whatever the input: constant time and constant extra space.

## A common mistake

Using `/` in place of `//` gives floats such as `1.0347...` hours. The problem needs whole units, which is what floor division provides.

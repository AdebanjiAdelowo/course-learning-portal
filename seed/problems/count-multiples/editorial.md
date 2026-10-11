## Idea

Visit every integer from `low` to `high` and count the ones whose remainder on division by `d` is zero. The only delicate point is the range: `range(low, high)` stops one short, so the stop value must be `high + 1`.

## Solution

```python
def count_multiples(low: int, high: int, d: int) -> int:
    count = 0
    for n in range(low, high + 1):
        if n % d == 0:
            count += 1
    return count


assert count_multiples(1, 10, 3) == 3          # 3, 6, 9
assert count_multiples(5, 5, 5) == 1           # a range of one number
assert count_multiples(7, 3, 2) == 0           # empty range
assert count_multiples(-6, 6, 3) == 5          # -6, -3, 0, 3, 6
```

## Why it is correct

**Invariant.** At the start of the iteration for `n`, `count` is the number of multiples of `d` among `low, ..., n - 1`.

Before the first iteration that range is empty and `count` is 0. An iteration adds 1 exactly when `n` is a multiple, which makes the statement true for `n + 1`. After the last iteration the range is `low, ..., high`, the whole interval.

When `low > high`, `range(low, high + 1)` is empty, the body never runs, and the function returns 0 as required.

For negative numbers the test still works: in Python `-6 % 3` is 0, because the remainder always lies between 0 and `d - 1` for a positive `d`.

## Complexity

The loop runs `high - low + 1` times: time proportional to the length of the interval, constant extra space.

## Going further: a constant-time formula

The multiples of `d` up to `x` number `x // d` when counting from 1, and floor division extends this correctly to negative `x`. The count in `[low, high]` is therefore `high // d - (low - 1) // d`. The check below confirms that the formula and the loop agree, including for negative ends and empty ranges.

```python
def count_multiples_fast(low: int, high: int, d: int) -> int:
    if low > high:
        return 0
    return high // d - (low - 1) // d


for low in range(-15, 16):
    for high in range(-15, 16):
        for d in (1, 2, 3, 7):
            assert count_multiples(low, high, d) == count_multiples_fast(low, high, d)
```

This is a first example of a theme of the course: the obvious method takes time proportional to the size of the range, and a little mathematics replaces it with one that takes the same time for any range.

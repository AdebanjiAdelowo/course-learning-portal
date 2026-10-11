## Idea

`n % 10` is the last decimal digit of `n`, and `n // 10` is `n` with that digit removed. Add the last digit to a running total, remove it, and repeat until no digits are left.

## Solution

```python
def digit_sum(n: int) -> int:
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total


assert digit_sum(4729) == 22
assert digit_sum(0) == 0
assert digit_sum(7) == 7
assert digit_sum(1000) == 1
```

## Why it is correct

Write `N` for the original value of `n`.

**Invariant.** At the start of every iteration, `total` plus the sum of the digits of the current `n` equals the sum of the digits of `N`.

It holds at the start, when `total` is 0 and `n` is `N`. An iteration moves the last digit of `n` out of `n` and into `total`, so the combined sum does not change. When the loop ends, `n` is 0, which has digit sum 0, so `total` is the digit sum of `N`.

**Termination.** For `n > 0`, `n // 10` is a smaller non-negative integer, so `n` reaches 0.

For `n = 0` the loop body never runs and the function returns 0, which is right.

An independent check, using the string form of the number, on every value up to ten thousand:

```python
for n in range(10_000):
    assert digit_sum(n) == sum(int(character) for character in str(n))
```

## Complexity

One iteration per decimal digit. A number `n >= 1` has `floor(log10(n)) + 1` digits, so the running time grows with the *logarithm* of `n`: a number a thousand times larger needs only three more iterations. Extra space is constant.

## A common mistake

Writing `while n >= 0`. The condition is still true when `n` reaches 0, and `0 // 10` is 0, so the loop never ends.

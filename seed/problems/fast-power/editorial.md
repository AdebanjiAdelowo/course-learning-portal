## Idea

Multiplying `base` by itself `n` times takes `n` multiplications. Squaring does better: once you know $b^{n/2}$, one more multiplication gives $b^n$. Halving the exponent at every other step reaches 0 in about $2 \log_2 n$ steps.

## Solution

```python
def power(base: int, exponent: int) -> int:
    if exponent == 0:
        return 1
    if exponent % 2 == 0:
        half = power(base, exponent // 2)
        return half * half
    return base * power(base, exponent - 1)


assert power(2, 10) == 1024
assert power(3, 5) == 243
assert power(7, 0) == 1
assert power(0, 0) == 1 and power(0, 4) == 0
assert power(-2, 3) == -8
```

## Why it is correct

By induction on the exponent $n$.

**Base case.** For $n = 0$ the function returns 1, which is $b^0$.

**Inductive step.** Take $n > 0$ and assume the function is correct for every exponent smaller than $n$.

- If $n$ is even, $n/2 < n$, so the recursive call returns $b^{n/2}$, and the function returns $b^{n/2} \cdot b^{n/2} = b^n$.
- If $n$ is odd, $n - 1 < n$, so the recursive call returns $b^{n-1}$, and the function returns $b \cdot b^{n-1} = b^n$.

In both cases the result is $b^n$.

**Termination.** Every recursive call has a strictly smaller, non-negative exponent, so the base case is reached.

A check against the built-in operator:

```python
for base in range(-4, 5):
    for exponent in range(0, 40):
        assert power(base, exponent) == base ** exponent
```

## Complexity

An odd exponent becomes even after one call, and an even exponent is halved. So at least every second call halves the exponent, and the number of calls is at most $2 \lfloor \log_2 n \rfloor + 2$: logarithmic. The recursion depth is the same, so the extra memory for the call stack is also logarithmic.

Counting the calls confirms it:

```python
import math


def calls(exponent: int) -> int:
    if exponent == 0:
        return 1
    if exponent % 2 == 0:
        return 1 + calls(exponent // 2)
    return 1 + calls(exponent - 1)


for n in range(1, 5000):
    assert calls(n) <= 2 * math.floor(math.log2(n)) + 2
assert calls(1_000_000) == 27
```

For an exponent of one million: 27 calls, where repeated multiplication would need a million.

(The count is of multiplications. For very large results, each multiplication of big integers is itself not constant time, the limit of the simple cost model noted in the lesson on counting cost.)

## Common mistakes

- Writing `power(base, exponent // 2) * power(base, exponent // 2)`. That makes two recursive calls where one is enough, and the running time goes back to linear. Store the result in a variable.
- Forgetting the base case, or using `exponent == 1` as the only base case, which fails for exponent 0.
- Using `/` in place of `//`, which turns the exponent into a float.

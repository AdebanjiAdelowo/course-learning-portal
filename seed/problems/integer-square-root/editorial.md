## Idea

There is no list here, but there is a sorted sequence in disguise. Consider the statement "$r \cdot r \le n$" for $r = 0, 1, 2, \dots$. It is true up to some value and false ever after, because $r^2$ increases with $r$. The answer is the last $r$ for which it is true.

Searching for the boundary of a true/false pattern like this is called *binary search on the answer*. It is the same algorithm as before, with a computed test in place of an array lookup.

## Solution

```python
def integer_sqrt(n: int) -> int:
    lo, hi = 0, n + 1           # the answer r satisfies lo <= r < hi
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if mid * mid <= n:
            lo = mid
        else:
            hi = mid
    return lo


assert [integer_sqrt(n) for n in range(10)] == [0, 1, 1, 1, 2, 2, 2, 2, 2, 3]
assert integer_sqrt(10**18) == 10**9
assert integer_sqrt(10**18 - 1) == 10**9 - 1
```

## Why it is correct

**Invariant.** $lo^2 \le n$ and $hi^2 > n$.

At the start $lo = 0$, and $0 \le n$. Also $hi = n + 1$, and $(n + 1)^2 > n$ for every $n \ge 0$. In each iteration $lo < mid < hi$ because $hi - lo > 1$, and the assignment keeps whichever half of the invariant $mid$ satisfies.

The loop ends when $hi = lo + 1$. The invariant then reads $lo^2 \le n < (lo + 1)^2$, which says precisely that $lo$ is the largest integer whose square does not exceed $n$.

**Termination.** Since $lo < mid < hi$, the difference $hi - lo$ strictly decreases in every iteration.

A check against the definition for every small input:

```python
for n in range(0, 5000):
    r = integer_sqrt(n)
    assert r * r <= n < (r + 1) * (r + 1)
```

## Complexity

The difference $hi - lo$ starts at $n + 1$ and roughly halves each time, so there are at most $\lceil \log_2 (n + 1) \rceil$ iterations: 60 for $n = 10^{18}$. Extra space is $\Theta(1)$.

Each iteration multiplies two integers. For numbers of this size that is a single machine operation. For integers with thousands of digits the multiplication itself is no longer constant time, which is the limit of the RAM model mentioned in the lesson on counting cost.

## Why not floating point

A double-precision float has 53 bits of precision, so it cannot represent every integer above $2^{53} \approx 9 \times 10^{15}$. For $n$ near $10^{18}$, `int(n ** 0.5)` can be off by one. Integer binary search is exact for every input.

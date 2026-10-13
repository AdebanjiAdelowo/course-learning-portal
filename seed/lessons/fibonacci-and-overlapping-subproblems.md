## 1. Motivation

Short recursive code can hide a vast computation. Fibonacci makes that danger visible: two child calls can repeat almost all the work done elsewhere in the tree. This lesson distinguishes correctness from efficiency and motivates storing intermediate answers.

## 2. Contract and intuition

Define `F(0)=0`, `F(1)=1`, and `F(n)=F(n-1)+F(n-2)` for integers `n >= 2`. Return `F(n)`. A direct translation of the definition is correct, but the definition alone does not promise an efficient evaluation strategy.

## 3. Pseudocode and Python

```text
FIB(n)
    if n < 2: return n
    return FIB(n - 1) + FIB(n - 2)
```

```python
def fib_naive(n):
    if n < 2:
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)


def fib_iterative(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


for n in range(16):
    assert fib_naive(n) == fib_iterative(n)
assert fib_iterative(0) == 0
assert fib_iterative(10) == 55
```

The input precondition is a non-negative integer. The loop simultaneously assigns both names from their old values; two sequential assignments would use a changed `a` in the second expression.

## 4. Worked recursion tree

`F(5)` calls `F(4)` and `F(3)`. `F(4)` already contains another `F(3)`. Below those calls, `F(2)` is evaluated repeatedly. These calls have equal inputs and equal outputs, yet the naive program recomputes them.

Record the frequency of each argument, rather than relying on wall-clock timing:

```python-run
counts = {}

def counted_fib(n):
    counts[n] = counts.get(n, 0) + 1
    if n < 2:
        return n
    return counted_fib(n - 1) + counted_fib(n - 2)


print("answer", counted_fib(6))
print("calls by argument", sorted(counts.items()))
print("total calls", sum(counts.values()))
```

There are 25 calls for input 6. Only seven distinct arguments occur. Maximum stack depth grows linearly, not like the total number of calls: the entire tree is not simultaneously active.

## 5. Correctness and termination

Strong induction proves correctness. The two base cases match the definition. For `n >= 2`, both child arguments are smaller non-negative integers, so their returned values are `F(n-1)` and `F(n-2)`. Adding them gives `F(n)` by definition. Each call decreases its argument until a base case is reached.

This proof establishes that the exponential computation returns the right answer; it does not establish that the algorithm is suitable for large input.

## 6. Cost analysis

Let `C(n)` count calls, including the root. Then `C(0)=C(1)=1` and `C(n)=1+C(n-1)+C(n-2)`. Define `D(n)=C(n)+1`; now `D(n)=D(n-1)+D(n-2)` with both base values 2. Thus `C(n)=2F(n+1)-1`.

Fibonacci grows exponentially, with base `(1+sqrt(5))/2`, so naive evaluation is exponential. The common upper bound `O(2^n)` is valid but not tight. Its auxiliary frame count is linear.

Iteration computes each next value once: linear additions, constant variable slots. Integer sizes still grow with `n`; neither addition bit cost nor result bit memory is constant for arbitrarily large values.

## 7. Memoization

Remember a result by its argument. A cached recursive solution has only `n+1` distinct subproblems, each evaluated once:

```python
from functools import cache

@cache
def fib_cached(n):
    if n < 2:
        return n
    return fib_cached(n - 1) + fib_cached(n - 2)


assert fib_cached(30) == 832040
assert fib_cached(30) == fib_iterative(30)
```

Memoization reduces redundant work, but does not remove the linear recursion depth. The cache also stores a linear number of integer results. Its lifetime matters: a global cached function retains results across calls unless its cache is cleared.

## 8. Mistakes and exercises

- Using only `n == 0` as a base case lets `n == 1` recurse into negative arguments.
- Confusing the tree's number of nodes with stack depth.
- Assuming memoization makes recursive evaluation safe at an arbitrarily large `n`.
- Treating timings for ten small inputs as a proof of asymptotic cost.

Derive `C(4)` from the recurrence: it is 9. Explain which repeated subproblem first appears in `F(4)`. Write an iterative version that returns all Fibonacci numbers through `F(n)` and account for its output memory separately.

## 9. Summary

A recurrence describing values is different from a recurrence describing evaluation cost. Repeated equal inputs are a clue that results can be reused. Correctness, call count, maximum depth and retained cache size are four different questions.

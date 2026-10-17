## 1. Motivation

Most recursion failures come from an unclear contract, a missing return, or a subproblem that does not shrink. A design checklist prevents those errors before code is written. We apply it to a balanced maximum finder and compare with iteration.

## 2. Contract and decomposition

Input: a non-empty sequence of integers and a non-empty valid interval `[lo, hi)`. Output: its maximum. Split an interval of length at least two into two smaller non-empty intervals. Their maximum values combine using `max(left, right)`.

Unlike summation, maximum has no natural integer answer for an empty interval. Returning zero is wrong for all-negative input. Choose an explicit error for empty top-level input.

## 3. Pseudocode

```text
MAX-RANGE(A, lo, hi)
    if hi - lo = 1: return A[lo]
    mid = floor((lo + hi) / 2)
    left = MAX-RANGE(A, lo, mid)
    right = MAX-RANGE(A, mid, hi)
    return max(left, right)
```

## 4. Python implementation

```python
def balanced_maximum(items):
    if not items:
        raise ValueError("maximum requires at least one value")
    def visit(lo, hi):
        if hi - lo == 1:
            return items[lo]
        mid = (lo + hi) // 2
        left = visit(lo, mid)
        right = visit(mid, hi)
        return max(left, right)
    return visit(0, len(items))


assert balanced_maximum([-5, -2, -9]) == -2
assert balanced_maximum([7]) == 7
assert balanced_maximum([3, 8, 8, 1]) == 8
try:
    balanced_maximum([])
except ValueError:
    pass
else:
    raise AssertionError("empty input must be rejected")
```

The wrapper establishes the inner function's stronger precondition. A nested function shares access to `items` without creating sliced copies. The wrapper is part of the contract, not an optional convenience.

## 5. Worked trace

For `[-5,-2,-9]`, the root splits at index 1. Its left child immediately returns -5. Its right child compares -2 and -9 and returns -2. The root compares -5 and -2 and returns -2. No zero value is introduced.

```python-run
def maximum_trace(items, lo, hi):
    print("enter", lo, hi)
    if hi - lo == 1:
        print("leaf", items[lo])
        return items[lo]
    mid = (lo + hi) // 2
    answer = max(maximum_trace(items, lo, mid), maximum_trace(items, mid, hi))
    print("return", lo, hi, answer)
    return answer


print(maximum_trace([-5, -2, -9], 0, 3))
```

## 6. Correctness

Strong induction on positive interval length. A singleton returns its sole element, hence its maximum. Both children of a larger interval are valid smaller non-empty intervals. By the hypothesis their returned answers are correct. Every parent element belongs to a child, so the larger child maximum is at least every parent value and is itself a parent value: it is the required maximum.

Length strictly decreases along each child call, proving termination. A contract for non-empty intervals allows a precise base case and avoids inventing an arbitrary empty result.

## 7. Time and memory

There are `n` singleton leaves and `n-1` internal calls. Each internal call performs one comparison, so total comparisons are exactly `n-1`, which is optimal in the comparison model: every non-maximum element must lose a comparison. Work is linear; frame depth is logarithmic. Iteration also uses `n-1` comparisons and constant variable slots, making it simpler for ordinary sequential Python.

The recursive version is valuable as a proof and decomposition example, not as an automatic performance improvement. Python does not execute the two child expressions in parallel merely because they are independent.

## 8. A debugging checklist

1. State allowed inputs and output meaning, including empty input.
2. Identify every base case and verify its result independently.
3. Write a decreasing integer measure and check it for every recursive edge.
4. Verify the child preconditions, not just their smaller size.
5. State how child results produce the parent answer.
6. Verify return propagation.
7. Count call-tree work and maximum simultaneous retained data separately.

Read a traceback from the deepest student frame back towards its caller. Repeated equal arguments suggest missing progress; repeated larger arguments suggest progress in the wrong direction. A `RecursionError` is evidence of excessive depth, not proof of an infinite mathematical algorithm: a correct linear-depth algorithm can also exceed Python's limit.

## 9. Differential testing

Compare with a trusted library implementation over many small inputs, including repeated and negative values:

```python
from itertools import product

for size in range(1, 6):
    for values in product((-3, 0, 2), repeat=size):
        assert balanced_maximum(list(values)) == max(values)
```

This check catches coding mistakes. The universal proof still depends on the contract, decomposition and inductive argument.

## 10. Exercises and summary

Implement a balanced minimum finder, preserving the empty-input contract. Change the combine operation to return both minimum and maximum; account for comparisons and returned data. Explain why an iterative scan is usually preferable for a sequential maximum.

Recursion is a design tool, not a goal in itself. Prefer it when the problem naturally decomposes or when tree-shaped structures make it clear. Prefer iteration when it removes unnecessary stack use without obscuring the argument. Always state the cost model, and never rely on increasing the interpreter recursion limit as a substitute for algorithm design.

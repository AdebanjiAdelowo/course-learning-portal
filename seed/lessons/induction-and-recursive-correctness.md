## 1. Motivation

Testing a recursive algorithm on many inputs can expose an error, but it cannot cover every input. A proof replaces the experiment with a statement that applies to all valid inputs. Mathematical induction matches recursive code especially well: the recursive call solves a smaller problem, and the proof uses correctness of that smaller result.

Our running problem is summing a sequence by dividing it into two contiguous halves. It illustrates why strong induction is useful: the children are not necessarily the size immediately before the parent's size.

## 2. Intuition and assumptions

Assume familiarity with the preceding factorial lesson, integer arithmetic and half-open intervals. For a sequence `items`, the interval `[lo, hi)` contains indices `lo` through `hi - 1`; its length is `hi - lo`. The empty interval has equal endpoints.

Instead of asking whether the recursive call is correct again from scratch, prove that every smaller input is already covered. You may use that hypothesis only for a strictly smaller input. A recursive call on the same input cannot be justified by assuming the conclusion you are trying to establish.

## 3. Ordinary and strong induction

Ordinary induction proves a property $P(n)$ for every non-negative integer by establishing $P(0)$ and showing $P(n-1)\Rightarrow P(n)$ for $n>0$.

Strong induction assumes all smaller cases: if $P(0),\ldots,P(n-1)$ hold, then $P(n)$ holds. This is useful when the algorithm calls itself on sizes such as $\lfloor n/2\rfloor$ and $\lceil n/2\rceil$. The two principles have the same mathematical strength. The stronger hypothesis is a convenient proof formulation, not permission to assume larger cases.

A proof also identifies what constitutes a valid input. Here we require $0\le lo\le hi\le\operatorname{len}(items)$, with numeric elements whose addition follows the intended arithmetic. The complexity model below counts additions, not their bit cost.

## 4. Formal problem and decomposition

Return the sum of the elements in `[lo, hi)`, with sum zero for an empty interval. When the interval contains at least two elements, set `mid = (lo + hi) // 2`. The two children `[lo, mid)` and `[mid, hi)` are disjoint and their union is the parent. That partition is why adding their sums gives the desired result.

Both child lengths are positive and strictly smaller than the parent's when the parent length is at least two. The one-element case must be handled first: otherwise a child would have the same length as its parent.

## 5. Pseudocode

```text
SUM-RANGE(A, lo, hi)
    if hi = lo: return 0
    if hi - lo = 1: return A[lo]
    mid = floor((lo + hi) / 2)
    left = SUM-RANGE(A, lo, mid)
    right = SUM-RANGE(A, mid, hi)
    return left + right
```

## 6. Python implementation

```python
def sum_range(items: list[int], lo: int, hi: int) -> int:
    """Sum items[lo:hi], assuming 0 <= lo <= hi <= len(items)."""
    length = hi - lo
    if length == 0:
        return 0
    if length == 1:
        return items[lo]
    mid = (lo + hi) // 2
    return sum_range(items, lo, mid) + sum_range(items, mid, hi)


assert sum_range([], 0, 0) == 0
assert sum_range([7], 0, 1) == 7
assert sum_range([3, -2, 8, 4], 0, 4) == 13
assert sum_range([3, -2, 8, 4], 1, 3) == 6
```

The function passes indices rather than sliced copies. This matters for memory and for the recurrence: creating a slice at every level adds copying work that is absent from this implementation.

## 7. Worked trace

For `[3, -2, 8, 4]`, the root is `[0,4)`. It calls `[0,2)`, which calls `[0,1)` and gets 3, then `[1,2)` and gets -2; their sum is 1. The root next calls `[2,4)`: its leaves return 8 and 4, so that child returns 12. The root returns 1 + 12 = 13.

There are seven calls, not four: four leaf calls and three internal calls. The stack never contains all seven simultaneously. It contains a root-to-leaf path, whose maximum length is three frames for this input. Call count and stack depth are different quantities.

```python-run
def traced_sum(items, lo, hi, depth=0):
    print("  " * depth + f"enter [{lo},{hi})")
    if lo == hi:
        result = 0
    elif hi - lo == 1:
        result = items[lo]
    else:
        mid = (lo + hi) // 2
        result = traced_sum(items, lo, mid, depth + 1) + traced_sum(items, mid, hi, depth + 1)
    print("  " * depth + f"return {result}")
    return result


assert traced_sum([3, -2, 8, 4], 0, 4) == 13
```

## 8. Correctness and termination

Let $P(n)$ mean that the function returns the required sum for every valid interval of length $n$.

**Base cases:** at length zero it returns the empty sum, zero; at length one it returns the sole element.

**Inductive step:** take a valid interval of length $n\ge2$ and assume correctness for every smaller length. Both child intervals satisfy the input precondition and have length smaller than $n$, so the hypothesis says their returned values equal their respective sums. The intervals partition the parent, so adding those returned values gives precisely the parent's sum.

**Termination:** interval length is a non-negative integer and strictly decreases along every recursive edge until a base case is reached. It is not sufficient to say that the *left* child decreases: every child must decrease.

## 9. Complexity

For powers of two, the recurrence is $T(n)=2T(n/2)+\Theta(1)$ with $T(1)=\Theta(1)$. At depth $d$ there are $2^d$ calls. There are $\log_2 n+1$ levels. Summing call counts gives $1+2+\cdots+n=2n-1$, so total time is $\Theta(n)$.

For arbitrary positive lengths the recursion tree still has exactly $n$ leaves, one for each element, and every internal node has two children. Such a full binary tree has $n-1$ internal nodes, hence $2n-1$ calls. We did not need to pretend that every input length is a power of two.

The maximum simultaneous frame count is $\lceil\log_2 n\rceil+1$ for $n\ge1$: auxiliary frame memory is $\Theta(\log n)$. A sequential iterative sum uses constant variable slots and also takes linear time. This recursive version teaches decomposition; it is not a claim that splitting a sum is faster in ordinary Python.

## 10. Mistakes and edge cases

- Missing the one-element base case leads to a non-shrinking child.
- Writing `mid + 1` as the right interval's lower endpoint omits the middle element in a half-open representation.
- A proof for the entire list alone does not justify arbitrary child intervals. State the property for every valid interval.
- With floating-point values, differently grouped additions can give different rounded results. The exact-integer contract avoids silently equating machine floats with real arithmetic.

An independent check can help find implementation mistakes even though it is not the proof:

```python
from itertools import product

for length in range(6):
    for values in product((-1, 0, 2), repeat=length):
        items = list(values)
        for lo in range(length + 1):
            for hi in range(lo, length + 1):
                assert sum_range(items, lo, hi) == sum(items[lo:hi])
```

## 11. Exercises and knowledge checks

1. Write the strong-induction hypothesis for recursive binary search. Which additional input precondition makes discarding half the interval valid?
2. Draw the summation tree for five elements and count its leaves, internal calls and maximum depth.
3. Prove the identity between leaves and internal nodes used above, by induction on the number of leaves.
4. Replace the leaf rule to count elements satisfying a predicate. Which parts of the proof stay the same?
5. Explain why passing slices changes the cost recurrence even though the decomposition argument still proves the returned sum.

Checks: five elements give five leaves and four internal calls. The deepest path has four frames. Sorted input is needed for binary search. Creating two slices copies a total of $n$ references at each level, adding $\Theta(n)$ work per level rather than constant work per internal call.

## 12. Summary and further study

Strong induction lets a recursive proof use any smaller case, not merely the immediately preceding one. A complete argument states the valid inputs, shows each recursive call preserves them, proves that every call decreases a well-founded measure, and shows how child results combine into the required output. The recursion tree counts all work; a root-to-leaf path counts simultaneous stack use.

Further study: compare this proof with the loop invariant for summation in Python Module P1. Both arguments connect a local progress step to a global claim, but induction over interval size and induction over processed elements use different measures.

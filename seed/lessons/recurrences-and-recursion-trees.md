## 1. Motivation

A recurrence records how an algorithm's work on an input relates to its work on smaller inputs. Solving it predicts scaling without conflating the algorithm with one computer's timing. This lesson uses factorial, search and balanced summation to show three different growth patterns.

## 2. State the cost model

Count primitive operations on bounded-size integers as unit cost. State the base case and the amount of work outside recursive calls. Ignore rounding only after explaining why it does not change the claimed asymptotic bound. When input length is zero, use a separate base case rather than taking its logarithm.

## 3. One shrinking call

Factorial has `T(n)=T(n-1)+c` for `n>0` and constant `T(0)`. Substitute repeatedly: `T(n)=T(n-k)+kc`. With `k=n`, the result is `T(0)+nc`, hence linear. The corresponding stack also has linear depth.

Binary search has one child of at most half the size. After `k` reductions its size is at most `floor(n/2^k)`. It becomes zero after logarithmically many steps. Constant work per level means logarithmic total time and recursive stack depth.

## 4. Two balanced children

For interval summation, `T(n)=T(floor(n/2))+T(ceil(n/2))+c`, with constant work at length one. For a power-of-two input, level `d` has `2^d` calls. Its work is `c*2^d`, and the last level has `n` calls. The geometric sum is proportional to `n`, not `n log n`.

If instead each internal call did linear work over its own interval, each level would cost approximately `cn`. There would be logarithmically many levels, producing `Theta(n log n)` total work. The recursion tree shape alone does not determine cost: labels on its nodes matter.

## 5. Pseudocode and exact count

```text
COUNT-SUM-CALLS(n)
    if n <= 1: return 1
    return 1 + COUNT-SUM-CALLS(floor(n/2)) + COUNT-SUM-CALLS(ceil(n/2))
```

```python
def sum_calls(n):
    if n <= 1:
        return 1
    return 1 + sum_calls(n // 2) + sum_calls(n - n // 2)


for n in range(1, 100):
    assert sum_calls(n) == 2 * n - 1
assert sum_calls(0) == 1
```

This counts work events; it does not compute a measured duration. The explicit zero case does not follow the positive-length formula.

## 6. Worked level table

For `n=8`, the call counts by level are 1, 2, 4, 8. Constant work per node sums to 15 units. Work equal to subproblem length gives totals 8, 8, 8, 8 across levels, or 32 units when leaves are charged similarly. Both trees have depth four frames; their work differs because their node costs differ.

```python-run
n = 8
size = n
nodes = 1
while size >= 1:
    print("nodes", nodes, "size", size, "constant-node work", nodes,
          "linear-node work", nodes * size)
    nodes *= 2
    size //= 2
```

## 7. Correctness and termination of the count recurrence

For positive `n`, guess `sum_calls(n)=2n-1`. The one-element case gives 1. Assuming the formula for both smaller children, substitution gives `1+(2floor(n/2)-1)+(2ceil(n/2)-1)=2n-1`, since floor and ceiling add to `n`. This proves correctness of the count formula by strong induction, not just a pattern noticed in a table. Termination follows because both child lengths are strictly smaller for n >= 2 and the base case handles n <= 1.

An upper-bound proof must select constants large enough to cover the non-recursive work and every base case. Writing `T(n)=O(n)` inside a substitution is not a proof unless the constant is justified.

## 8. Space follows simultaneous activity

Depth-first recursive evaluation completes one child before the next. Stack frames follow a path rather than a level, giving logarithmic frame space for balanced summation. If the implementation stores copied arrays in those frames, charge that data separately. If it retains all tree nodes for a visualization, the visualization itself can take linear memory although the algorithm does not.

## 9. Errors and practice

Do not multiply total call count by maximum subproblem size: that overcounts work differently across levels. Do not use the recurrence `2T(n/2)` for binary search, which evaluates only one half. Do not assign constant node work to code that slices or traverses a subproblem.

Solve `T(n)=T(n-1)+n` by expansion: the sum is quadratic. Explain why a recursion chain can take quadratic time and linear stack space. For `n=16`, balanced summation makes 31 calls and has five simultaneously active frames. Predict both before running code.

## 10. Summary

Count branches, quantify shrinkage, label non-recursive work and include base costs. Expand a recurrence or draw a correctly labelled recursion tree, then prove the guess. Analyze retained memory independently of total work.

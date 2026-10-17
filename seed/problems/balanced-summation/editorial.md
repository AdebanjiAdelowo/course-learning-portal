## Idea

Pass interval boundaries to avoid copying the data at each call.

## Python solution

```python
def balanced_sum(items: list[int]) -> int:
    def visit(lo, hi):
        if lo == hi:
            return 0
        if hi - lo == 1:
            return items[lo]
        mid = (lo + hi) // 2
        return visit(lo, mid) + visit(mid, hi)
    return visit(0, len(items))

assert balanced_sum([]) == 0
assert balanced_sum([3, -2, 8, 4]) == 13
assert balanced_sum([7]) == 7
```

## Correctness and termination

Strong induction on interval length proves each child sum. The children are disjoint, cover the parent, and are smaller when its length is at least two. Adding their correct sums gives the parent sum.

## Complexity

Linear work, with 2n-1 calls for positive n, and logarithmic frame depth.

## Edge cases

The supplied samples include the smallest inputs. Check the empty or base input before making a recursive call. Propagate the child result with return, and never assume annotation syntax enforces the input contract.

## Idea

The midpoint comparison rules out one half because the input is sorted.

## Python solution

```python
def recursive_search(items: list[int], target: int) -> int:
    def visit(lo, hi):
        if lo == hi:
            return -1
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            return visit(mid + 1, hi)
        return visit(lo, mid)
    return visit(0, len(items))

assert recursive_search([], 7) == -1
assert recursive_search([1, 3, 5, 7, 9], 7) == 3
assert recursive_search([1, 3, 5], 4) == -1
```

## Correctness and termination

Induct on interval length. Empty intervals cannot match. Equality gives a valid answer. Sortedness excludes the discarded half, and the remaining interval is strictly shorter. Returning its answer preserves the contract.

## Complexity

Logarithmic comparisons and frame depth in the worst case; constant best-case work.

## Edge cases

The supplied samples include the smallest inputs. Check the empty or base input before making a recursive call. Propagate the child result with return, and never assume annotation syntax enforces the input contract.

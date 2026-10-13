## Idea

Count each half separately and add. A singleton contributes either zero or one.

## Python solution

```python
def count_recursive(items: list[int], target: int) -> int:
    def visit(lo, hi):
        if lo == hi:
            return 0
        if hi - lo == 1:
            return int(items[lo] == target)
        mid = (lo + hi) // 2
        return visit(lo, mid) + visit(mid, hi)
    return visit(0, len(items))

assert count_recursive([], 1) == 0
assert count_recursive([1, 2, 1, 1], 1) == 3
assert count_recursive([2, 3], 1) == 0
```

## Correctness and termination

The empty and singleton cases satisfy the count definition. A partition into two smaller intervals counts every position once, so adding child counts gives the parent count. Interval length decreases along each edge.

## Complexity

Linear comparisons, logarithmic frame depth; no mutation or slicing.

## Edge cases

The supplied samples include the smallest inputs. Check the empty or base input before making a recursive call. Propagate the child result with return, and never assume annotation syntax enforces the input contract.

## Idea

At index i, sum the suffix beginning there. The empty suffix contributes zero.

## Python solution

```python
def recursive_sum(items: list[int]) -> int:
    def visit(i):
        if i == len(items):
            return 0
        return items[i] + visit(i + 1)
    return visit(0)

assert recursive_sum([]) == 0
assert recursive_sum([3, -2, 8]) == 9
assert recursive_sum([7]) == 7
```

## Correctness and termination

Induct on suffix length. The empty suffix returns zero; adding its first element to the correct smaller suffix sum gives the entire suffix sum. The index increases until it reaches len(items).

## Complexity

Linear additions and linear stack depth; no slices or copied input.

## Edge cases

The supplied samples include the smallest inputs. Check the empty or base input before making a recursive call. Propagate the child result with return, and never assume annotation syntax enforces the input contract.

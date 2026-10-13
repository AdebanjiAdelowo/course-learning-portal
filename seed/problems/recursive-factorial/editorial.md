## Idea

Use n! = n * (n-1)! after handling the empty product.

## Python solution

```python
def factorial(n: int) -> int:
    if n == 0:
        return 1
    return n * factorial(n - 1)

assert factorial(0) == 1
assert factorial(4) == 24
assert factorial(1) == 1
```

## Correctness and termination

The zero case returns its defined value. Assuming correctness for n-1, multiplication by n gives n!. The non-negative argument strictly decreases.

## Complexity

n multiplications, n+1 calls, linear stack frames. These are operation counts, not constant bit costs for arbitrary huge integers.

## Edge cases

The supplied samples include the smallest inputs. Check the empty or base input before making a recursive call. Propagate the child result with return, and never assume annotation syntax enforces the input contract.

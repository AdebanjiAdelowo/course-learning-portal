## 1. Motivation

Some problems are naturally described in terms of smaller copies of themselves. To sort a list, sort each half and merge. To search a tree, search its subtrees. A function that calls itself expresses such a method directly. Merge sort, quicksort, tree traversals, depth-first search and dynamic programming are all recursive ideas, so being comfortable with recursion is a requirement for most of what follows.

## 2. Prerequisites

Python Module P1, especially functions and loops, and lessons 1 to 3 of this module.

## 3. The idea

A **recursive function** is one that calls itself. To be correct it needs two things.

- A **base case**: an input small enough to answer directly, without a further call.
- A **recursive case**: the answer for a larger input, built from the answer for a *strictly smaller* one.

"Strictly smaller" is what guarantees the function stops. Each call moves towards the base case, and reaches it after finitely many steps.

**The leap of faith.** When writing the recursive case, *assume* the function already works for every smaller input, and ask only: given that answer, how do I finish the job? This is not wishful thinking. It is mathematical induction, and DSA Module 2 turns it into a proof technique.

**The call stack.** Each call gets its own copy of the function's local variables, kept in a *frame*. A call that makes another call waits, with its frame intact, until the inner call returns. The frames pile up like a stack of plates and are removed in the reverse order.

## 4. Syntax and semantics

There is no special syntax. A recursive function is an ordinary function whose body contains a call to itself.

```python
def factorial(n: int) -> int:
    """Return n! = 1 * 2 * ... * n, with 0! = 1. Precondition: n >= 0."""
    if n == 0:                          # base case
        return 1
    return n * factorial(n - 1)         # recursive case: a strictly smaller input


assert factorial(0) == 1
assert factorial(1) == 1
assert factorial(5) == 120
```

What happens for `factorial(3)`: the calls go down until the base case is reached, then the multiplications happen on the way back up.

```text
factorial(3)
    3 * factorial(2)
            2 * factorial(1)
                    1 * factorial(0)
                            returns 1          <- base case
                    returns 1 * 1 = 1
            returns 2 * 1 = 2
    returns 3 * 2 = 6
```

Four frames were on the stack at the deepest point. In general `factorial(n)` uses n + 1 frames, so its extra memory grows in proportion to n, although the function has only one local variable.

**Recursion and iteration.** Anything written with a loop can be written recursively, and the reverse. They are two ways of saying "repeat".

```python
def factorial_loop(n: int) -> int:
    result = 1
    for k in range(2, n + 1):
        result *= k
    return result


for n in range(0, 20):
    assert factorial(n) == factorial_loop(n)
```

| | Loop | Recursion |
| --- | --- | --- |
| Repeats by | going round again | calling itself on a smaller input |
| Stops when | the condition is false | the base case is reached |
| Extra memory | usually constant | one frame per level of depth |
| Natural for | sequences, counting | halves, trees, nested structures |

For a simple count such as factorial, the loop is the better choice in Python. Recursion earns its place when the problem splits into *more than one* smaller problem, or when the data is itself nested.

**The recursion limit.** Python refuses to go deeper than about 1000 nested calls and raises a `RecursionError`. This is a safety limit, not a law of nature. In practice it means a recursion whose depth grows in proportion to n is unsuitable for large n in Python, while one whose depth grows like log n, as in binary search, is never a problem.

## 5. Worked example

**Sum of a list, recursively.** The sum of an empty list is 0. The sum of a non-empty list is its first element plus the sum of the rest.

```python
def total(items: list[int]) -> int:
    if not items:                       # base case: empty list
        return 0
    return items[0] + total(items[1:])  # the rest is one element shorter


assert total([]) == 0
assert total([5]) == 5
assert total([4, 8, 15]) == 27
```

This is correct, and it is also a lesson in hidden cost. `items[1:]` *copies* the rest of the list on every call: n − 1 elements, then n − 2, and so on, about n²/2 copies in total. Pass an index instead of a slice and the copying disappears.

```python
def total_from(items: list[int], start: int = 0) -> int:
    """Return the sum of items[start:]."""
    if start == len(items):             # base case: nothing left
        return 0
    return items[start] + total_from(items, start + 1)


assert total_from([4, 8, 15]) == 27
assert total_from([]) == 0
```

**Fast exponentiation.** Compute `base ** exponent` for an integer exponent n ≥ 0.

The obvious method multiplies n times. A better one uses the fact that an even power is a square:

$$
b^n =
\begin{cases}
1 & \text{if } n = 0, \\
\left(b^{n/2}\right)^2 & \text{if } n \text{ is even}, \\
b \cdot b^{\,n-1} & \text{if } n \text{ is odd}.
\end{cases}
$$

For $2^{10}$: $2^{10} = (2^5)^2$, $2^5 = 2 \cdot 2^4$, $2^4 = (2^2)^2$, $2^2 = (2^1)^2$, $2^1 = 2 \cdot 2^0$, and $2^0 = 1$. Six calls, where the obvious method needs ten multiplications. The gap widens quickly: for n = 1,000,000 this takes about 40 calls.

```python
def power(base: int, exponent: int) -> int:
    """Return base ** exponent. Precondition: exponent >= 0."""
    if exponent == 0:
        return 1
    if exponent % 2 == 0:
        half = power(base, exponent // 2)
        return half * half              # one recursive call, used twice
    return base * power(base, exponent - 1)


assert power(2, 10) == 1024
assert power(7, 0) == 1
assert power(3, 5) == 243
assert power(0, 0) == 1 and power(0, 3) == 0

for base in range(-3, 4):
    for exponent in range(0, 12):
        assert power(base, exponent) == base ** exponent
```

Every second step at least halves the exponent, so the number of calls grows like log n. Note the variable `half`: writing `power(base, exponent // 2) * power(base, exponent // 2)` would compute the same thing twice at every level and throw the whole advantage away.

## 6. Try it

```python-run
def countdown(n):
    if n == 0:
        print("lift-off")
        return
    print(n)
    countdown(n - 1)
    print("returning from", n)      # runs on the way back up


countdown(3)


def depth_of(n, depth=1):
    """How many calls does halving take to reach 1?"""
    if n <= 1:
        return depth
    return depth_of(n // 2, depth + 1)


for n in (1, 8, 1000, 1000000):
    print(n, "->", depth_of(n), "calls")
```

Things to try: remove the base case from `countdown` and read the error. Call `countdown(-1)` and explain what happens.

## 7. Common mistakes

- **No base case, or one that is never reached.** `factorial(-1)` skips past 0 and recurses until Python stops it. State the precondition, or test `n <= 0`.
- **A recursive call that is not smaller.** `f(n)` calling `f(n)` or `f(n + 1)` never ends.
- **Forgetting `return` on the recursive call.** `factorial(n - 1)` on its own line computes a value and throws it away; the function then returns `None`.
- **Slicing on every call.** `items[1:]` is a linear-time copy. Pass an index.
- **Computing the same subproblem twice.** Store the result of a recursive call in a variable if you need it more than once.
- **Deep recursion on large input.** A depth proportional to n hits the recursion limit near n = 1000. Use a loop for those.

## 8. Practice

1. Draw the calls and returns for `factorial(4)`, in the style of section 4.
2. Write `count_down_sum(n)` that returns 1 + 2 + ... + n recursively. What is the base case? How deep is the recursion?
3. Write a recursive `reverse_text(text)`. Then say what it costs, remembering that slicing and concatenating strings copy.
4. Write `is_palindrome_recursive(text, left, right)` that uses indices and does not slice.
5. In `power`, how many calls are made for exponent 16? For exponent 15? Explain the difference.

Then solve **Fast power** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can identify the base case and the recursive case of a function.
- [ ] I can explain why each recursive call must be on a strictly smaller input.
- [ ] I can trace the call stack of a small recursive call.
- [ ] I can say when recursion is the better tool and when a loop is.

## 10. Summary

A recursive function solves a problem by calling itself on a strictly smaller input until it reaches a base case it can answer directly. Each call has its own frame on the call stack, so recursion depth costs memory. Recursion and iteration can express the same computations. Prefer a loop for a simple count, and recursion when a problem divides into smaller problems, as it will in divide and conquer, trees and graphs.

## 11. Further study

- The Python Tutorial, section 4.8, "Defining Functions", for how calls and local variables work.
- Downey, *Think Python* (3rd edition, O'Reilly, 2024), the chapter on recursion, for stack diagrams.
- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition), section 2.3, where divide and conquer is introduced. This is where DSA Module 2 picks up.

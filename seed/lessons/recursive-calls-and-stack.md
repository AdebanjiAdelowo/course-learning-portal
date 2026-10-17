## 1. Motivation

A recursive function can be only four lines long and still seem mysterious. The missing information is what happens to the caller while its child is running. The caller does not disappear: its local variables and the point where execution will resume remain in a stack frame. Understanding those suspended calls is the first step towards proving a recursive algorithm correct and bounding its memory.

We will compute factorial. Later lessons use the same reasoning for binary search and divide-and-conquer summation. The point is not that recursion makes factorial faster. It gives us a small example in which every call and every return can be inspected.

## 2. Prerequisites and intuition

You should know Python functions, parameters, return values and conditionals from Python Module P1, and the introductory recursion lesson in P2. A function calling itself is an ordinary function call with a new set of local variables. It is not a jump back to the beginning of the same frame.

Think of asking a colleague for a smaller result before completing your own calculation. You remember what to do with their answer. They may ask another colleague. When someone can answer immediately, the replies travel back in reverse order. That last-in, first-out ordering is why a stack is the appropriate model.

## 3. Formal problem

Input: an integer $n \ge 0$.

Output: $n!$, the product of the integers from 1 through $n$. Define $0! = 1$, the empty product. This convention makes the recurrence $n! = n(n-1)!$ valid for every $n \ge 1$.

The precondition matters. Negative integers are not inputs to this problem; decreasing a negative integer would never reach zero. A production function should check inputs at its boundary. Inside the mathematical proof, we may assume the precondition holds.

## 4. Pseudocode

```text
FACTORIAL(n)
    if n = 0
        return 1
    child = FACTORIAL(n - 1)
    return n * child
```

The call on the third line must finish before multiplication can happen. In particular, the recursive expression is not a loop accumulating a product on its way down. The multiplications occur on the way back up.

## 5. Python implementation

```python
def factorial(n: int) -> int:
    """Return n! for a non-negative integer n."""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return 1
    child = factorial(n - 1)
    return n * child


assert factorial(0) == 1
assert factorial(1) == 1
assert factorial(4) == 24
assert factorial(6) == 720
```

Annotations describe the contract; Python does not enforce an annotation automatically. The examples here use integers. An application exposing this function to arbitrary callers would also decide whether booleans, floats or custom numeric objects are permitted.

## 6. Step-by-step call stack

For `factorial(3)`, the descending calls are 3, 2, 1, 0. The zero call returns immediately. The pending computations then become $1 \cdot 1$, $2 \cdot 1$, and $3 \cdot 2$.

| Event | Active stack, oldest first | Returned value |
| --- | --- | --- |
| Enter 3 | 3 | not yet known |
| Enter 2 | 3, 2 | not yet known |
| Enter 1 | 3, 2, 1 | not yet known |
| Enter 0 | 3, 2, 1, 0 | 1 |
| Resume 1 | 3, 2, 1 | 1 |
| Resume 2 | 3, 2 | 2 |
| Resume 3 | 3 | 6 |
| Finish | empty | 6 |

Use Step forward to follow the calls. At the base case, pause and predict each pending return. Step backward restores a recorded state: it does not execute Python backwards.

```viz
algorithm: recursive-factorial
target: 4
```

The visualization is a bounded deterministic teaching model. It shows at most nine frames (`n` from 0 to 8), not CPython's actual native stack or student-defined code.

## 7. Correctness and termination

We prove the result by induction on $n$.

**Base case:** when $n=0$, the function returns 1, which equals $0!$ by definition.

**Inductive step:** suppose the function returns $(n-1)!$ for input $n-1$. For input $n>0$, it makes that call, multiplies the result by $n$, and returns $n(n-1)! = n!$. This is exactly the required output.

That is a proof of the output conditional on the smaller call completing. We must also prove termination. Every recursive call decreases a non-negative integer by one. There cannot be an infinite strictly decreasing sequence of non-negative integers, so zero is reached after $n$ decrements. At zero no further call is made.

Both claims are needed: a procedure that would return the right result if it ever stopped is not enough.

## 8. Time and auxiliary memory

There are $n+1$ calls, including the base case, and exactly $n$ multiplications. In the introductory unit-cost model, $T(n)=T(n-1)+\Theta(1)$ with $T(0)=\Theta(1)$, so time is $\Theta(n)$.

The maximum stack depth is $n+1$. Each pending call must retain its argument and continuation, so frame overhead is $\Theta(n)$. An iterative version avoids those pending frames:

```python
def factorial_iterative(n: int) -> int:
    if n < 0:
        raise ValueError("n must be non-negative")
    product = 1
    for value in range(1, n + 1):
        product *= value
    return product


for n in range(50):
    assert factorial(n) == factorial_iterative(n)
```

Python integers are arbitrary precision. The answer itself has $\Theta(n\log n)$ bits, so neither version uses constant *bit memory* when output size is counted. Likewise multiplying increasingly large integers is not a constant-time machine operation. Saying the iterative version has constant auxiliary space is shorthand for a constant number of variable slots under the unit-cost model, not a constant number of bytes.

Python does not eliminate tail calls. Even writing recursion in a tail-recursive style does not turn its stack use into a constant. For large $n$, use an iterative version or a suitable library function: the recursive one may raise `RecursionError` before completing. Do not raise the recursion limit as a routine solution to that problem.

## 9. Experiment

This example records the order of entering and leaving calls. Change `n` and predict the trace before running it.

```python-run
def traced_factorial(n):
    print("enter", n)
    if n == 0:
        print("base", n, "returns 1")
        return 1
    child = traced_factorial(n - 1)
    result = n * child
    print("return", n, "value", result)
    return result


print("answer", traced_factorial(4))
```

## 10. Common mistakes and edge cases

- Omitting the base case. The function repeatedly decrements into negative values until the interpreter reports excessive recursion.
- Returning zero at the base case. Every multiplication then becomes zero.
- Writing the recursive call without returning or using its result. The caller receives `None` if the function falls through.
- Using `n == 1` as the only base case. Input zero then has no terminating path.
- Forgetting that every pending caller has its own `n`. Updating a local name in one frame does not update the caller's variable.

Here is a wrong version that *terminates* but forgets its result:

```python
def forgotten_return(n):
    if n == 0:
        return 1
    forgotten_return(n - 1)


assert forgotten_return(3) is None
```

Termination and correctness are separate; this example satisfies only the former.

## 11. Practice and knowledge checks

1. Draw all frames for `factorial(2)`, including the base case. State the largest depth and the multiplication count.
2. Explain why changing the recursive argument from `n - 1` to `n + 1` invalidates the termination proof.
3. Write a recursive sum of the first $n$ non-negative integers. Give its base case, inductive argument, recurrence and stack depth.
4. Why does a successful run on the values 0 through 50 not establish correctness for all non-negative integers?
5. Which claims change if integer multiplication is charged by operand bit length rather than one unit?

Answers to the numerical check: input 2 creates three frames, makes two multiplications, and returns 2. A finite experiment cannot replace the quantified inductive proof. The multiplication count remains two for input 2 under any model, but the cost attached to each multiplication can change.

## 12. Summary and further study

Recursion creates pending work. A base case stops descent, a decreasing measure proves termination, induction proves the returned value, and maximum simultaneous pending calls determines stack depth. The next lesson separates ordinary induction from strong induction and uses multiple smaller subproblems.

Further study: the Python documentation on function definitions and the `sys.getrecursionlimit` documentation. The limit is an interpreter safeguard, not a theorem about how much recursion a particular machine can safely support.

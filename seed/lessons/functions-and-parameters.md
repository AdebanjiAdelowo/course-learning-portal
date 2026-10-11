## 1. Motivation

Every algorithm in this course is written as a function: it receives an input and returns an output. A function is also what makes an algorithm *testable*. You can call it on a small input, compare the result with what you expected, and repeat for the edge cases. The practice problems on this site work exactly that way: they call your function with sample arguments and compare what it returns.

## 2. Prerequisites

Lessons 1 to 4 of this module, in particular assignment and loops.

## 3. The idea

A **function** is a named block of code with inputs and an output.

- **Parameters** are the names listed in the definition. They are placeholders.
- **Arguments** are the actual values supplied in a call.
- The **return value** is what the call evaluates to.

A function is a *contract*. The caller promises to supply arguments that satisfy the function's requirements, called the **precondition**. The function promises what it returns if the precondition holds, called the **postcondition**. Binary search, for example, requires a sorted list, and promises nothing if the list is not sorted.

**Returning is not printing.** `print` shows text to a person. `return` hands a value back to the code that made the call, which can store it, compare it or pass it on. A function that prints its answer and returns nothing cannot be used as a building block, and cannot be tested automatically.

## 4. Syntax and semantics

```text
def name(parameter1, parameter2):
    """One line saying what the function returns."""
    block
    return value
```

```python
def average(values: list[float]) -> float:
    """Return the mean of values. Precondition: values is not empty."""
    return sum(values) / len(values)


result = average([4, 8, 15])          # call: the argument is the list
assert result == 9
assert average([10, 20]) + 1 == 16    # a returned value can be used in an expression
```

- The text in triple quotes is a **docstring**. State what is returned and any precondition.
- `values: list[float]` and `-> float` are **type hints**. They document what is expected. Python does not enforce them.
- `return` ends the function immediately. Code after it in the same block does not run.

**A function without `return` returns `None`.** This is the most common cause of a mysterious `None` in a result.

```python
def show_double(n):
    print(n * 2)          # shows the value, returns nothing


def double(n):
    return n * 2          # gives the value back


assert double(5) == 10
assert show_double(5) is None       # prints 10, but the call itself is None
```

**Local variables.** Names created inside a function exist only during that call. They are separate from names with the same spelling elsewhere.

```python
def with_delivery(price):
    total = price + 5         # 'total' is local to this call
    return total


total = 100                   # a different 'total', outside the function
assert with_delivery(50) == 55
assert total == 100           # unchanged by the call
```

**Default and keyword arguments.** A parameter can have a default value, and arguments can be passed by name.

```python
def power(base, exponent=2):
    return base ** exponent


assert power(5) == 25
assert power(5, 3) == 125
assert power(exponent=3, base=2) == 8
```

**Returning several values.** Separate them with commas. The caller receives a tuple and can unpack it.

```python
def split_duration(seconds):
    """Return (hours, minutes, seconds) for a number of seconds >= 0."""
    return seconds // 3600, seconds % 3600 // 60, seconds % 60


hours, minutes, rest = split_duration(3725)
assert (hours, minutes, rest) == (1, 2, 5)
```

## 5. Worked example

Write a function that returns the greatest common divisor of two positive integers, the largest integer that divides both.

A simple method, known since Euclid: as long as the two numbers differ, subtract the smaller from the larger. Any number that divides both `a` and `b` also divides `a - b`, so the set of common divisors does not change. When the two numbers are equal, that number is the answer.

| `a` | `b` | Action |
| --- | --- | --- |
| 48 | 18 | 48 > 18, so `a = 30` |
| 30 | 18 | 30 > 18, so `a = 12` |
| 12 | 18 | 12 < 18, so `b = 6` |
| 12 | 6 | 12 > 6, so `a = 6` |
| 6 | 6 | equal: return 6 |

```python
def gcd(a: int, b: int) -> int:
    """Return the greatest common divisor of a and b. Precondition: a > 0 and b > 0."""
    while a != b:
        if a > b:
            a -= b
        else:
            b -= a
    return a


assert gcd(48, 18) == 6
assert gcd(18, 48) == 6       # the order of the arguments does not matter
assert gcd(7, 7) == 7
assert gcd(1, 99) == 1
assert gcd(17, 5) == 1        # no common divisor except 1
```

Check the function against the definition itself on many small inputs. This is slower than `gcd` but obviously right, which is what a check should be.

```python
def gcd_by_definition(a: int, b: int) -> int:
    return max(d for d in range(1, min(a, b) + 1) if a % d == 0 and b % d == 0)


for a in range(1, 40):
    for b in range(1, 40):
        assert gcd(a, b) == gcd_by_definition(a, b)
```

The precondition matters. With `a = 0` the loop would subtract 0 for ever. A function is only required to work when its precondition holds, and it is the docstring's job to state it.

## 6. Try it

```python-run
def is_even(n):
    return n % 2 == 0


def count_even(numbers):
    """Return how many of the numbers are even."""
    count = 0
    for n in numbers:
        if is_even(n):          # one function calling another
            count += 1
    return count


print(count_even([1, 2, 3, 4, 6]))
print(count_even([]))

assert count_even([1, 2, 3, 4, 6]) == 3
assert count_even([]) == 0
assert count_even([7]) == 0
print("all checks passed")
```

Things to try: change `return count` to `print(count)` and read what the assertions report. Then indent `return count` one level further, so that it is inside the loop, and work out why the answer becomes wrong.

## 7. Common mistakes

- **Printing instead of returning.** The function shows the right number and every test fails, because the call evaluates to `None`.
- **Returning inside the loop too early.** A `return` in the body ends the function on the first pass.
- **Forgetting to call the function.** `gcd` is the function itself. `gcd(48, 18)` is a call.
- **Changing the name or parameters asked for.** A practice problem calls a specific name with specific arguments. A different signature produces a `NameError` or `TypeError`.
- **Using a mutable default.** `def f(items=[])` shares one list between all calls. Use `None` as the default and create the list inside. Lesson 3 of Python Module P2 explains why.
- **Ignoring the precondition.** State it in the docstring, and do not rely on behaviour outside it.

## 8. Practice

1. What do these print, and why: `print(double(3))` and `print(show_double(3))`, for the functions in section 4?
2. Write `is_divisible(n, d)` returning a `bool`, then use it to write `count_multiples(low, high, d)`, the number of multiples of `d` from `low` to `high` inclusive.
3. Write a docstring with a precondition and a postcondition for a function `index_of_maximum(items)`. What should it do for an empty list? Decide, and say so in the docstring.
4. `gcd` in section 5 can be very slow: how many iterations does `gcd(1000000, 1)` take? Replace repeated subtraction with one use of `%` and test your version against `gcd_by_definition`.

Then solve **Count the multiples** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can tell a parameter from an argument, and returning from printing.
- [ ] I can say what a function returns when it has no `return` statement.
- [ ] I can state a precondition and a postcondition for a function.
- [ ] I can test a function against a slower method that is obviously correct.

## 10. Summary

A function takes arguments and returns a value. Return the answer; do not print it. Names inside a function are local to each call. A docstring states the contract: what must be true of the arguments, and what is then true of the result. Test a function on typical inputs, on edge cases, and against a simple method you trust.

## 11. Further study

- The Python Tutorial, sections 4.8 and 4.9, "Defining Functions" and "More on Defining Functions".
- PEP 257, "Docstring Conventions", for how docstrings are normally written.
- Python documentation, the `typing` module, for the type hints used in this course.

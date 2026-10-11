## 1. Motivation

An algorithm that does the same thing on every input is not much of an algorithm. Binary search looks at the middle element and then goes left or right. That decision is a conditional. Getting the condition exactly right, including what happens when two values are *equal*, is where most bugs in search and sorting code come from.

## 2. Prerequisites

Lessons 1 and 2 of this module: values and types, arithmetic and comparison operators.

## 3. The idea

A **condition** is an expression whose value is `True` or `False`. An `if` statement runs a block of code only when its condition is true.

Conditions are built from comparisons and combined with three **boolean operators**.

| `a` | `b` | `a and b` | `a or b` | `not a` |
| --- | --- | --- | --- | --- |
| True | True | True | True | False |
| True | False | False | True | False |
| False | True | False | True | True |
| False | False | False | False | True |

`and` is true only when both sides are true. `or` is true when at least one side is true, including when both are. In everyday speech "or" often means "one or the other but not both". In Python it never means that.

## 4. Syntax and semantics

```text
if condition:
    block run when the condition is true
elif other_condition:
    block run when the first was false and this one is true
else:
    block run when none of the conditions above was true
```

- The colon and the **indentation** are part of the syntax. The indented lines form the block. Use four spaces.
- The conditions are tested from top to bottom, and **exactly one** block runs: the first whose condition is true. The rest are skipped, even if their conditions are also true.
- `elif` and `else` are optional. Without `else`, it is possible that no block runs.

```python
def describe(n: int) -> str:
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    else:
        return "positive"


assert describe(-5) == "negative"
assert describe(0) == "zero"
assert describe(12) == "positive"
```

**Short-circuit evaluation.** Python evaluates `a and b` from left to right and stops as soon as the answer is known. If `a` is false, `b` is never evaluated. If `a` is true in `a or b`, `b` is never evaluated. This is not just an optimisation. It lets the left side protect the right side:

```python
items = []
i = 0

# Safe: the index is only used when it is known to be valid.
if i < len(items) and items[i] == 7:
    found = True
else:
    found = False
assert found is False

divisor = 0
assert not (divisor != 0 and 10 / divisor > 1)     # no division by zero happens
```

You will see exactly this pattern in insertion sort: `while i >= 0 and items[i] > key`. The order of the two tests matters.

**Chained comparisons** read like mathematics: `0 <= i < n` means `0 <= i and i < n`.

**De Morgan's laws** tell you how to negate a combined condition, which you need whenever you ask "when does this loop stop?"

$$
\text{not } (a \text{ and } b) \equiv (\text{not } a) \text{ or } (\text{not } b), \qquad
\text{not } (a \text{ or } b) \equiv (\text{not } a) \text{ and } (\text{not } b).
$$

```python
for a in (True, False):
    for b in (True, False):
        assert (not (a and b)) == ((not a) or (not b))
        assert (not (a or b)) == ((not a) and (not b))
```

## 5. Worked example

A year is a leap year if it is divisible by 4, except that century years are leap years only if they are divisible by 400.

Take the rule apart before writing code. "Divisible by 4" is `year % 4 == 0`. A century year is one with `year % 100 == 0`.

| Year | Divisible by 4 | Divisible by 100 | Divisible by 400 | Leap year |
| --- | --- | --- | --- | --- |
| 2024 | yes | no | no | yes |
| 2023 | no | no | no | no |
| 1900 | yes | yes | no | no |
| 2000 | yes | yes | yes | yes |

Reading the table: a year is a leap year when it is divisible by 4 and not by 100, or when it is divisible by 400.

```python
def is_leap_year(year: int) -> bool:
    return (year % 4 == 0 and year % 100 != 0) or year % 400 == 0


assert is_leap_year(2024)
assert not is_leap_year(2023)
assert not is_leap_year(1900)
assert is_leap_year(2000)
```

The four test years are not arbitrary. There is one for every row of the table, so every branch of the rule is exercised. Choosing tests that way is a habit worth forming now.

Notice also that the function returns the condition itself. Writing `if condition: return True` followed by `else: return False` says the same thing in four lines.

## 6. Try it

```python-run
def grade(score):
    if score >= 70:
        return "pass"
    elif score >= 50:
        return "borderline"
    else:
        return "fail"


for score in (95, 70, 69, 50, 49, 0):
    print(score, grade(score))
```

Things to try: swap the first two conditions so that `score >= 50` is tested first. What does `grade(95)` return now, and why? Then change `>=` to `>` and see which scores change.

## 7. Common mistakes

- **Testing conditions in the wrong order.** Only the first true branch runs. Put the most specific condition first.
- **Off-by-one at the boundary.** `>` and `>=` differ on exactly one value. Always test the boundary itself.
- **Writing `if x == 1 or 2`.** This means `(x == 1) or 2`, and `2` counts as true, so the condition is always true. Write `x == 1 or x == 2`.
- **Using `=` in a condition.** `if x = 5:` is a syntax error. Comparison is `==`.
- **Comparing to `True`.** Write `if ready:` and `if not ready:`, not `if ready == True:`.
- **Putting the unsafe test first.** `items[i] == 7 and i < len(items)` fails with an `IndexError` when `i` is out of range. The guard must come first.

## 8. Practice

1. For each value of `x` in `-1`, `0`, `5`, `10`, `11`, say whether `0 <= x <= 10 and x != 5` is true.
2. Use De Morgan's laws to rewrite `not (i >= 0 and items[i] > key)` without the outer `not`.
3. Write a function `sign(n)` that returns `-1`, `0` or `1`.
4. A function should return the largest of three numbers. Write it with `if` and `elif`, and list the test inputs you need to be confident it is right, including ties.

Then solve **Leap year** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can fill in the truth tables for `and`, `or` and `not`.
- [ ] I can say which branch of an `if`, `elif`, `else` chain runs for a given input.
- [ ] I can explain short-circuit evaluation and why the order of two tests can matter.
- [ ] I can negate a combined condition with De Morgan's laws.

## 10. Summary

A condition evaluates to `True` or `False`. In an `if`, `elif`, `else` chain exactly one block runs: the first whose condition is true. `and` and `or` stop evaluating as soon as the result is known, which lets a cheap, safe test guard an unsafe one. Boundaries, where `<` and `<=` differ, deserve a test of their own.

## 11. Further study

- The Python Tutorial, section 4.1, "if Statements".
- Python Language Reference, section 6.11, "Boolean operations", for the exact rules of short-circuit evaluation.
- Python documentation, "Truth Value Testing", for which values count as false (`0`, `""`, `[]`, `None`).

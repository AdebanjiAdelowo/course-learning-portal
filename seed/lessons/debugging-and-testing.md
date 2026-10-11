## 1. Motivation

Writing code that works on the example in front of you is the easy part. This course asks for code that works on *every* valid input, and that standard is only reachable with a method: test deliberately, read errors carefully, and find a bug by narrowing down where it can be, not by changing lines until the output looks right. The method is a skill, and it is the one that most separates people who finish hard problems from people who get stuck.

## 2. Prerequisites

Python Module P1, and lessons 1 to 4 of this module. You should be able to trace a loop in a table.

## 3. The idea

**Testing** is checking that a function does what its contract says. A test is an input together with the output you expect. Testing can show that a bug is present. It can never show that none are, which is why DSA Module 1 also teaches proofs. The two complement each other.

**Debugging** is finding out why a test fails. It is an investigation with a simple logic: the program does exactly what the code says, so if the result surprises you, some belief you hold about the code is false. Debugging means finding which one.

Three kinds of error, from easiest to hardest:

| Kind | When it shows | Example | How you find it |
| --- | --- | --- | --- |
| Syntax error | Before the program runs | A missing colon | Python points at the line |
| Runtime error | While running, as an exception | Index out of range | Read the traceback |
| Logic error | Never, by itself: the answer is just wrong | `<` where `<=` was needed | Only a test reveals it |

Logic errors are the dangerous kind. A program with one runs happily and returns a wrong answer.

## 4. Syntax and semantics

**`assert`.** `assert condition, message` does nothing when the condition is true and raises `AssertionError` when it is false. It turns a belief about the program into something the program checks.

```python
def maximum(items: list[int]) -> int:
    """Return the largest element. Precondition: items is not empty."""
    assert len(items) > 0, "maximum() needs a non-empty list"
    best = items[0]
    for value in items[1:]:
        if value > best:
            best = value
    return best


assert maximum([4, 9, 2]) == 9
assert maximum([7]) == 7
assert maximum([-3, -1, -2]) == -1        # all negative: catches "best = 0" bugs
```

**Reading a traceback.** When an exception is not handled, Python prints a traceback. Read it from the bottom.

```text
Traceback (most recent call last):
  File "solution.py", line 9, in <module>
    print(average([]))
  File "solution.py", line 2, in average
    return sum(values) / len(values)
ZeroDivisionError: division by zero
```

- The **last line** is the type of error and its message: what went wrong.
- The **lines above** are the chain of calls, the most recent last: where it went wrong. Here, line 2, inside `average`, called from line 9.

The error type narrows the search at once.

| Exception | Usual cause |
| --- | --- |
| `NameError` | A misspelt name, or a name used before it is assigned |
| `TypeError` | Wrong kind of value, or wrong number of arguments. Often a `None` that should be a value |
| `IndexError` | An index outside 0 to n − 1. Often an off-by-one |
| `KeyError` | A dictionary key that is not present |
| `ValueError` | The right type but an unusable value, such as `int("abc")` |
| `ZeroDivisionError` | Dividing by zero. Often an empty input |
| `RecursionError` | A missing or unreachable base case |

**Choosing test cases.** A handful of well-chosen inputs beats a hundred similar ones. For any function on a sequence, go through this list.

| Category | Examples for a function on a list |
| --- | --- |
| Typical | A few elements in no special order |
| Empty | `[]`, if the precondition allows it |
| Smallest non-empty | One element |
| Boundaries | The answer is at the first position, or the last |
| Duplicates | Equal elements, all elements equal |
| Extremes of order | Already sorted, sorted in reverse |
| Sign and zero | Negative numbers, zero |
| Absent | The thing looked for is not there |

**Comparing with a trusted method.** Write the slowest, most obvious solution you can, and check that the clever one agrees with it on every small input. A check like this found the errors in most published "correct" binary searches.

```python
from itertools import product


def maximum_trusted(items: list[int]) -> int:
    return sorted(items)[-1]            # obviously right, and slower


for length in range(1, 6):
    for values in product(range(-2, 3), repeat=length):
        assert maximum(list(values)) == maximum_trusted(list(values))
```

**Print debugging.** To see what a loop is really doing, print the variables at the top of each pass, with labels. Compare the output with the trace you made by hand. The first line where they differ is where your belief and the program part company. Remove the prints when you are done.

## 5. Worked example

The function below should return how many elements of a sorted list are strictly less than `target`. It has a bug.

```python
def count_less_buggy(items: list[int], target: int) -> int:
    count = 0
    i = 0
    while items[i] < target:
        count += 1
        i += 1
    return count


assert count_less_buggy([1, 3, 5, 7], 5) == 2        # looks fine
assert count_less_buggy([1, 3, 5, 7], 0) == 0        # still fine
```

Two tests pass. Work through the checklist from section 4 before trusting it. **Boundary: the target is larger than everything.** Trace `count_less_buggy([1, 3], 9)` by hand:

| `i` | `items[i]` | `items[i] < 9` | Action |
| --- | --- | --- | --- |
| 0 | 1 | true | `count = 1`, `i = 1` |
| 1 | 3 | true | `count = 2`, `i = 2` |
| 2 | `items[2]` does not exist | | `IndexError` |

The belief that was false: "the loop always meets an element that is not less than the target". It does not when every element is smaller. The empty list fails for the same reason.

```python
for arguments in [([1, 3], 9), ([], 4)]:
    try:
        count_less_buggy(*arguments)
        raise AssertionError("expected an IndexError")
    except IndexError:
        pass                    # the bug, reproduced deliberately
```

**The fix.** Guard the index, and put the guard *first* so that short-circuit evaluation protects the access.

```python
def count_less(items: list[int], target: int) -> int:
    """Return how many elements of the sorted list items are < target."""
    i = 0
    while i < len(items) and items[i] < target:
        i += 1
    return i


assert count_less([1, 3, 5, 7], 5) == 2
assert count_less([1, 3], 9) == 2             # the case that failed
assert count_less([], 4) == 0                 # and the empty list
assert count_less([2, 2, 2], 2) == 0          # duplicates equal to the target
assert count_less([2, 2, 2], 3) == 3

for length in range(0, 5):
    for values in product(range(4), repeat=length):
        ordered = sorted(values)
        for target in range(-1, 5):
            assert count_less(ordered, target) == len([v for v in ordered if v < target])
```

The steps, which are the same for every bug:

1. **Reproduce** it with the smallest input you can find.
2. **Trace** that input by hand and locate the first step that differs from what you expected.
3. **State** the false belief in a sentence.
4. **Fix** the cause, not the symptom.
5. **Keep** the failing input as a test, so the bug cannot come back unnoticed.

## 6. Try it

This function should return the largest value in a list. It passes its first test and has a bug. Find an input that exposes it, then fix it.

```python-run
def largest(items):
    best = 0
    for value in items:
        if value > best:
            best = value
    return best


print(largest([4, 9, 2]))        # 9: correct
print(largest([7]))              # 7: correct

# Go through the checklist: empty, one element, duplicates, sorted, NEGATIVE...
print(largest([-3, -1, -2]))     # what should this be? what is it?
```

Things to try: add `print("value:", value, "best:", best)` at the top of the loop body and compare the output with a trace made by hand. Then fix the initial value of `best`.

## 7. Common mistakes

- **Testing only the example from the problem statement.** It is the one case almost every wrong solution also gets right.
- **Changing code at random until a test passes.** You have not found the bug. You have hidden it.
- **Reading only the last line of a traceback.** The line number above it tells you where.
- **Fixing the symptom.** Adding `if i >= len(items): return count` after the fact, without understanding why `i` got there.
- **Deleting a test that fails.** A failing test is information. Keep it.
- **Trusting a clever solution because it is clever.** Compare it with a slow one that is obviously right.

## 8. Practice

1. For a function `index_of(items, target)`, list eight test cases, one from each category in section 4, with the expected result for each.
2. This traceback ends in `TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'`. Name two likely causes.
3. A function returns the right answer for every list you try except lists with one element. Where would you look first, and why?
4. Write a slow, obviously correct `is_sorted_trusted(items)` that compares every pair of positions, and use it to test a one-pass version on all lists of length up to 5 with values from 0 to 2.
5. Explain in two sentences why passing tests does not prove a function correct.

Then return to any practice problem where a sample test failed, and apply the five steps from section 5.

## 9. Check your understanding

- [ ] I can read a traceback and say what went wrong and on which line.
- [ ] I can list the categories of test case for a function on a sequence.
- [ ] I can check a function against a slower, obviously correct one.
- [ ] I can describe the five steps for finding and fixing a bug.

## 10. Summary

Syntax errors and exceptions announce themselves. Logic errors do not, and only tests find them. Choose tests by category: empty, single, boundary, duplicate, extreme, absent. Read tracebacks from the bottom. When a test fails, reproduce it with a small input, trace it by hand, name the belief that turned out to be false, fix the cause, and keep the test. Compare anything clever with something slow and obviously right.

## 11. Further study

- The Python Tutorial, section 8, "Errors and Exceptions".
- Python documentation, the `unittest` module, for organising tests in larger projects.
- Bentley, *Programming Pearls* (2nd edition, Addison-Wesley, 1999), columns 4 and 5, on writing and testing a correct binary search.
- Agans, *Debugging: The 9 Indispensable Rules* (AMACOM, 2002), a short book on the method.

## 1. Motivation

A loop is what makes a program do more work than its author typed. Every algorithm in this course is built around one: linear search loops over positions, binary search loops while a range is non-empty, sorting loops inside a loop. Reading a loop means being able to say what is true each time it comes round. That skill starts here.

## 2. Prerequisites

Lessons 1 to 3 of this module: assignment, operators, conditions and `if`.

## 3. The idea

Python has two kinds of loop.

- A **`for` loop** runs its block once for each item of a sequence. Use it when you know in advance what you are going through: the numbers 0 to n − 1, the elements of a list, the characters of a string.
- A **`while` loop** runs its block again and again as long as a condition is true. Use it when you cannot tell in advance how many passes are needed: "halve the range until it is empty".

Each pass through the block is called an **iteration**.

A `while` loop only ends if something in its block eventually makes the condition false. A loop whose condition never becomes false runs for ever. On this site, the **Stop execution** button ends such a program, and it is stopped automatically after a few seconds.

## 4. Syntax and semantics

```text
for name in sequence:
    block

while condition:
    block
```

**`range`** produces the integers a `for` loop most often needs. The stop value is **not** included.

| Call | Produces |
| --- | --- |
| `range(5)` | 0, 1, 2, 3, 4 |
| `range(2, 6)` | 2, 3, 4, 5 |
| `range(0, 10, 3)` | 0, 3, 6, 9 |
| `range(5, 0, -1)` | 5, 4, 3, 2, 1 |
| `range(3, 3)` | nothing: the loop body does not run |

`range(n)` has exactly `n` values, and they are exactly the valid indices of a list of length `n`. That is why the stop value is excluded.

```python
assert list(range(5)) == [0, 1, 2, 3, 4]
assert list(range(2, 6)) == [2, 3, 4, 5]
assert list(range(0, 10, 3)) == [0, 3, 6, 9]
assert list(range(5, 0, -1)) == [5, 4, 3, 2, 1]
assert list(range(3, 3)) == []
assert len(range(1000)) == 1000
```

**The accumulator pattern.** Start a variable at a neutral value, then update it on every pass.

```python
total = 0                       # neutral value for addition
for number in range(1, 6):      # 1, 2, 3, 4, 5
    total += number
assert total == 15

largest = None                  # "nothing seen yet"
for value in [4, 9, 2, 9, 1]:
    if largest is None or value > largest:
        largest = value
assert largest == 9
```

**`break`** leaves the nearest loop at once. **`continue`** skips the rest of the block and goes on to the next iteration. Use both sparingly: a loop with one way out is easier to reason about.

**A `while` loop and its exit.** When a `while` loop ends normally, its condition is false. That one fact is how every correctness argument in this course finishes.

```python
value = 100
steps = 0
while value > 1:
    value //= 2
    steps += 1
assert value == 1               # the condition "value > 1" is now false
assert steps == 6               # 100, 50, 25, 12, 6, 3, 1
```

Any `for` loop over a `range` can be written as a `while` loop. Doing so shows the three parts that every counting loop has: initialise, test, update.

```python
i = 0                           # initialise
squares = []
while i < 4:                    # test
    squares.append(i * i)
    i += 1                      # update: without this line the loop never ends
assert squares == [0, 1, 4, 9]
assert i == 4                   # the first value for which the test failed
```

## 5. Worked example

Compute the sum of the decimal digits of 4729.

The idea uses the two operators from lesson 2: `n % 10` is the last digit, and `n // 10` removes it. Repeat until nothing is left.

| Iteration | `n` before | `n % 10` | `total` after | `n` after |
| --- | --- | --- | --- | --- |
| 1 | 4729 | 9 | 9 | 472 |
| 2 | 472 | 2 | 11 | 47 |
| 3 | 47 | 7 | 18 | 4 |
| 4 | 4 | 4 | 22 | 0 |

The loop stops when `n` is 0. A table like this is called a **trace**. Writing one by hand is the most reliable way to find out what a loop really does.

```python
def digit_sum(n: int) -> int:
    """Return the sum of the decimal digits of n, for n >= 0."""
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total


assert digit_sum(4729) == 22
assert digit_sum(0) == 0        # the loop body never runs
assert digit_sum(7) == 7
assert digit_sum(1000) == 1
```

Two questions to ask of every `while` loop, and their answers here:

- **Does it end?** `n` is a non-negative integer and `n // 10` is strictly smaller than `n` whenever `n > 0`, so `n` must reach 0.
- **What is true each time round?** `total` holds the sum of the digits already removed. When `n` reaches 0 all digits have been removed, so `total` is the answer. A statement like this is a *loop invariant*, and DSA Module 1 is built on them.

## 6. Try it

```python-run
# Count how many numbers from 1 to 20 are divisible by 3.
count = 0
for number in range(1, 21):
    if number % 3 == 0:
        print(number, "is divisible by 3")
        count += 1
print("count:", count)

# How many doublings does it take to pass 1000?
value = 1
doublings = 0
while value <= 1000:
    value *= 2
    doublings += 1
print("doublings:", doublings, "final value:", value)
```

Things to try: change `range(1, 21)` to `range(20)` and explain the difference. Delete the line `value *= 2`, run it, and use **Stop execution**.

## 7. Common mistakes

- **Off by one with `range`.** `range(1, n)` stops at `n - 1`. To include `n`, write `range(1, n + 1)`.
- **Forgetting the update in a `while` loop.** The condition never changes and the loop never ends.
- **Updating the wrong way.** `while i > 0: i += 1` moves away from the exit.
- **Initialising the accumulator inside the loop.** It is reset on every pass. Initialise before the loop.
- **Changing a list while looping over it.** Removing items during a `for` loop skips elements. Build a new list instead.
- **Using the loop variable after an empty loop.** If the sequence is empty, the variable was never assigned.

## 8. Practice

1. How many times does the body run: `for i in range(3, 12, 4)`, `for i in range(10, 0, -3)`, `for i in range(5, 5)`?
2. Trace `digit_sum(908)` in a table like the one in section 5.
3. Rewrite `for i in range(2, 11, 2): print(i)` as a `while` loop. Mark the initialise, test and update parts.
4. The loop `while n != 0: n -= 2` is meant to count down to zero. For which starting values of `n` does it never end? Rewrite the condition so that it always ends.

Then solve **Sum of digits** and **Count the multiples** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can list the values produced by `range` with one, two and three arguments.
- [ ] I can choose between `for` and `while` and say why.
- [ ] I can trace a loop in a table, one row per iteration.
- [ ] I can argue that a `while` loop ends by naming a quantity that shrinks.

## 10. Summary

`for` goes through a known sequence, and `while` repeats until a condition fails. `range(n)` gives 0 to n − 1, the indices of a list of length n. An accumulator starts at a neutral value and is updated on each pass. For every `while` loop, be able to say why it ends and what is true each time round. Those two statements are termination and the loop invariant, the core of the next module.

## 11. Further study

- The Python Tutorial, sections 4.2 to 4.5: `for` statements, `range`, `break` and `continue`.
- Python documentation, "Built-in Types", the entry on `range`, for its exact definition and why it uses almost no memory.
- Downey, *Think Python* (3rd edition, O'Reilly, 2024), the chapters on iteration, for more practice at tracing loops.

## 1. Motivation

Two Python functions can look almost identical and differ by a factor of ten thousand in running time. The reason is nearly always the same: a single line that reads as one step is quietly doing work proportional to the size of the data. This lesson teaches you to see those lines. It is the bridge to DSA Module 1, where "how much work" is given a precise meaning.

## 2. Prerequisites

Lessons 1 to 5 of this module, in particular the cost tables for lists, sets and dictionaries.

## 3. The idea

**A line of Python is not a unit of work.** `x = items[0]` does a fixed, small amount of work. `x = max(items)` examines every element. Both are one line.

To estimate how the running time of a function grows with the size n of its input:

1. For each line, ask what it costs **each time it runs**: a fixed amount, or an amount that grows with n?
2. Ask **how many times** it runs.
3. Multiply, and add up. The largest term dominates.

The vocabulary used from here on:

| Name | Grows like | If n doubles, the work | Typical cause |
| --- | --- | --- | --- |
| Constant | 1 | stays the same | Indexing, arithmetic, a dictionary lookup |
| Logarithmic | log n | increases by a fixed amount | Halving the range |
| Linear | n | doubles | One pass over the data |
| Linearithmic | n log n | slightly more than doubles | Sorting |
| Quadratic | n² | quadruples | A pass inside a pass |

DSA Module 1 defines these precisely, with the notation O, Ω and Θ. For now, the table is enough to compare two functions.

**The rule that catches most problems:** a linear-time operation inside a loop that runs n times costs about n² in total.

## 4. Syntax and semantics

The hidden linear-time operations worth memorising:

| Operation | Why it is linear |
| --- | --- |
| `x in a_list`, `a_list.index(x)`, `a_list.count(x)` | Scans the list |
| `a_list.insert(0, x)`, `a_list.pop(0)`, `del a_list[0]` | Shifts every element |
| `a_list[a:b]`, `list(a_list)`, `a_list + other` | Copies elements |
| `text + other`, `text[a:b]` | Strings are immutable, so a new one is built |
| `min`, `max`, `sum`, `sorted` | Read every element |
| `a_list == other` | Compares element by element |

And the constant-time ones you can use freely: indexing, `len`, `append`, `pop()` from the end, and `in` on a set or dictionary.

**Measure, do not guess.** The functions below count their own basic steps, so the results are exact and identical on every machine.

```python
def common_slow(first: list[int], second: list[int]) -> tuple[int, int]:
    """Return (number of values of first that are in second, element comparisons made)."""
    comparisons = 0
    count = 0
    for value in first:
        for other in second:            # what "value in second" does behind the scenes
            comparisons += 1
            if value == other:
                count += 1
                break
    return count, comparisons


def common_fast(first: list[int], second: list[int]) -> tuple[int, int]:
    """The same count, with one set lookup per element of first."""
    lookup = set(second)                # one pass over second
    lookups = 0
    count = 0
    for value in first:
        lookups += 1
        if value in lookup:             # constant time on average
            count += 1
    return count, lookups


for n in (10, 100, 1000):
    first = list(range(n))
    second = list(range(n, 2 * n))      # nothing in common: the worst case for the slow version
    assert common_slow(first, second) == (0, n * n)
    assert common_fast(first, second) == (0, n)
```

For n = 1000 the first version makes a million comparisons and the second a thousand lookups. Both return the same answer.

```python
import random

generator = random.Random(2026)         # seeded, so the check is reproducible
for _ in range(200):
    first = [generator.randrange(20) for _ in range(generator.randrange(12))]
    second = [generator.randrange(20) for _ in range(generator.randrange(12))]
    assert common_slow(first, second)[0] == common_fast(first, second)[0]
```

**Do work once.** If a value does not change inside a loop, compute it before the loop.

```python
def above_average_slow(values: list[float]) -> list[float]:
    return [v for v in values if v > sum(values) / len(values)]      # sum() runs n times


def above_average(values: list[float]) -> list[float]:
    mean = sum(values) / len(values)                                 # once
    return [v for v in values if v > mean]


assert above_average([1, 2, 3, 10]) == above_average_slow([1, 2, 3, 10]) == [10]
```

**Stop early.** If the answer is known, return. A loop that keeps going after it has found what it wanted wastes the difference between the best case and the worst.

**Do not copy what you only need to read.** Pass indices instead of slices, as in the recursion lesson.

## 5. Worked example

Given a list of integers and a target, decide whether two different positions hold values that add up to the target.

**Version 1: try every pair.**

```python
def has_pair_sum_slow(items: list[int], target: int) -> bool:
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] + items[j] == target:
                return True
    return False
```

There are n(n − 1)/2 pairs. When no pair works, every one of them is tested: quadratic.

**Version 2: remember what has been seen.** For each value `v`, the partner it needs is `target - v`. Ask whether that partner has already appeared.

Trace for `items = [8, 3, 5, 9]` and `target = 12`:

| `v` | Needs | `seen` before | Found? | Action |
| --- | --- | --- | --- | --- |
| 8 | 4 | {} | no | add 8 |
| 3 | 9 | {8} | no | add 3 |
| 5 | 7 | {8, 3} | no | add 5 |
| 9 | 3 | {8, 3, 5} | **yes** | return `True` |

```python
def has_pair_sum(items: list[int], target: int) -> bool:
    """Return True if two different positions hold values that sum to target."""
    seen = set()
    for value in items:
        if target - value in seen:      # constant time on average
            return True
        seen.add(value)
    return False


assert has_pair_sum([8, 3, 5, 9], 12)
assert not has_pair_sum([8, 3, 5, 9], 100)
assert not has_pair_sum([6], 12)                  # one element cannot pair with itself
assert has_pair_sum([6, 6], 12)                   # two equal elements can
assert not has_pair_sum([], 0)

from itertools import product

for length in range(0, 5):
    for values in product(range(-2, 4), repeat=length):
        for target in range(-4, 7):
            assert has_pair_sum(list(values), target) == has_pair_sum_slow(list(values), target)
```

Adding the value to `seen` *after* the test is what stops an element pairing with itself. Putting those two lines the other way round is a real bug, and the test `has_pair_sum([6], 12)` is there to catch it.

| | Version 1 | Version 2 |
| --- | --- | --- |
| Time | Quadratic | Linear on average |
| Extra memory | Constant | Linear: the set |
| n = 100,000, no pair | About 5 billion additions | 100,000 lookups |

Neither is free. The second buys time with memory. If the list were *sorted*, a third version would get linear time with constant memory by moving two indices inwards from the ends: the two-pointer technique, which has its own module.

## 6. Try it

Run this and compare the two step counts as n grows.

```python-run
def count_steps_list(n):
    items = list(range(n))
    steps = 0
    for value in range(n):
        for other in items:         # what "value in items" has to do
            steps += 1
            if other == value:
                break
    return steps


def count_steps_set(n):
    items = set(range(n))
    steps = 0
    for value in range(n):
        steps += 1                  # one lookup: "value in items"
    return steps


for n in (10, 100, 1000):
    print(n, "list:", count_steps_list(n), "set:", count_steps_set(n))
```

Things to try: predict the two numbers for n = 2000 before running it. When n doubles, by what factor does each count grow?

## 7. Common mistakes

- **`x in some_list` inside a loop.** Convert the list to a set once, before the loop.
- **Recomputing inside a loop.** `len` is free, but `sum`, `max`, `sorted` and slices are not. Compute once, outside.
- **Building a string with `+=` in a loop.** Collect parts in a list and `join` them.
- **Removing from the front of a list repeatedly.** Each `pop(0)` shifts everything. Move an index, or use `collections.deque`.
- **Sorting inside a loop.** Sort once before the loop, if the data does not change.
- **Optimising before it is correct.** A fast wrong answer is worthless. Make it right, test it, then make it fast, and test again against the slow version.
- **Micro-optimising.** Shaving a constant factor off a quadratic function does not help. Changing quadratic to linear does.

## 8. Practice

1. Classify each as constant, linear or quadratic in the length of `items`: `items[-1]`, `items.count(0)`, `len(items)`, `[x for x in items if x in items]`, `sorted(items)[0]`, `min(items)`.
2. `sorted(items)[0]` and `min(items)` return the same value. Which is better, and why?
3. Rewrite to run in linear time: `[x for x in first if x in second]`, where both are lists.
4. This function is quadratic. Find the line responsible and fix it: it builds `result = []` and repeatedly does `result.insert(0, value)` for each value of a list.
5. Write `first_unique(text)` that returns the first character occurring exactly once, or `None`, in linear time. Use a dictionary of counts and two passes.

Then finish the remaining practice problems and the project for this module. You are ready for DSA Module 1.

## 9. Check your understanding

- [ ] I can name five Python operations that look like one step and are linear.
- [ ] I can spot a linear operation inside a loop and estimate the total cost.
- [ ] I can replace a repeated list search with a set or dictionary lookup.
- [ ] I can explain the trade between time and memory in the pair-sum example.

## 10. Summary

The cost of a function is the cost of each line multiplied by how often it runs. Many single lines of Python are linear: membership in a list, slicing, inserting at the front, `sum`, `max`, string concatenation. A linear operation inside a loop makes a quadratic function. The standard repairs are a set or dictionary for lookups, computing invariants once before a loop, stopping early, and passing indices instead of copies. Make it correct first, then efficient, and check the fast version against the slow one.

## 11. Further study

- Python Wiki, "TimeComplexity", the reference table for the built-in collections.
- Python documentation, the `timeit` module, for measuring running time without the usual mistakes.
- Python documentation, `collections.deque`, a sequence with fast operations at both ends.
- DSA Module 1 of this course, "Algorithms, correctness and cost", where the cost model and asymptotic notation are defined precisely.

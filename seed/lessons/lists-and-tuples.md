## 1. Motivation

The list is the data structure this course uses more than any other. Searching, sorting, two pointers, sliding windows, heaps and dynamic programming tables are all, underneath, operations on a list. To reason about how fast an algorithm is, you need to know what each list operation costs, and some that look alike differ by a factor of n.

## 2. Prerequisites

Python Module P1, in particular loops, functions, and string indexing and slicing. Lists use the same indexing rules as strings.

## 3. The idea

A **list** is an ordered, **mutable** sequence: its elements have positions, and it can be changed in place by replacing, adding or removing elements.

A **tuple** is an ordered, **immutable** sequence: once created it cannot be changed.

Both are *sequences*, like strings. They share indexing from 0, negative indices, slicing, `len`, `in` and looping.

Use a list for a collection that changes, or whose length is not known in advance. Use a tuple for a fixed group of values that belong together, such as a pair of coordinates or the several values a function returns.

**How a list is stored.** A Python list is a *dynamic array*: a block of adjacent slots, each holding a reference to an element. Two consequences follow, and they explain every cost in the table below.

- Any element can be reached directly from its index, in the same time whatever the length.
- Inserting or deleting anywhere except the end means shifting every later element by one slot.

## 4. Syntax and semantics

```python
scores = [72, 85, 91, 60]

assert scores[0] == 72 and scores[-1] == 60     # indexing, as for strings
assert scores[1:3] == [85, 91]                  # a slice is a new list
assert len(scores) == 4
assert 91 in scores and 100 not in scores       # membership: scans the list

scores[0] = 75                # replace in place
scores.append(78)             # add at the end
assert scores == [75, 85, 91, 60, 78]

last = scores.pop()           # remove and return the last element
assert last == 78 and scores == [75, 85, 91, 60]

scores.insert(1, 80)          # insert before index 1: later elements shift right
assert scores == [75, 80, 85, 91, 60]

first = scores.pop(0)         # remove the first: later elements shift left
assert first == 75 and scores == [80, 85, 91, 60]
```

**What each operation costs**, for a list of length n. "Constant" means the time does not depend on n. "Linear" means it grows in proportion to n.

| Operation | Cost | Why |
| --- | --- | --- |
| `items[i]`, `items[i] = x` | Constant | Direct access by position |
| `len(items)` | Constant | The length is stored |
| `items.append(x)` | Constant on average | Occasionally the block must grow |
| `items.pop()` | Constant | Removes from the end |
| `items.insert(0, x)`, `items.pop(0)` | Linear | Every element shifts |
| `x in items`, `items.index(x)` | Linear | May examine every element |
| `items[a:b]`, `list(items)` | Linear in the size of the copy | Copies the elements |
| `min(items)`, `sum(items)` | Linear | Reads every element |
| `sorted(items)`, `items.sort()` | About n log n | Covered in the sorting modules |

"Constant on average" for `append` is an *amortised* bound. It has a precise meaning and a proof, both in DSA Module 3.

**Looping.** Loop over the elements directly when you only need the values. Use `range(len(items))` when you need positions, and `enumerate` when you need both.

```python
names = ["Ada", "Alan", "Grace"]

lengths = []
for name in names:                       # values only
    lengths.append(len(name))
assert lengths == [3, 4, 5]

for i in range(len(names)):              # positions, for example to modify in place
    names[i] = names[i].upper()
assert names == ["ADA", "ALAN", "GRACE"]

pairs = []
for index, name in enumerate(names):     # both
    pairs.append((index, name))
assert pairs == [(0, "ADA"), (1, "ALAN"), (2, "GRACE")]
```

**Sorting has two forms, and they are easy to confuse.** `sorted(items)` returns a new sorted list and leaves `items` alone. `items.sort()` sorts in place and returns `None`.

```python
values = [3, 1, 2]
assert sorted(values) == [1, 2, 3] and values == [3, 1, 2]     # original untouched
assert values.sort() is None and values == [1, 2, 3]           # sorted in place
```

**List comprehensions** build a list from a loop in one expression.

```python
squares = [n * n for n in range(5)]
assert squares == [0, 1, 4, 9, 16]
evens = [n for n in range(10) if n % 2 == 0]
assert evens == [0, 2, 4, 6, 8]
```

**Tuples** are written with commas, usually in brackets. They support everything that does not modify.

```python
point = (3, 4)
x, y = point                          # unpacking
assert x == 3 and y == 4
assert point[0] == 3 and len(point) == 2
assert (1, 2) < (1, 3) < (2, 0)       # compared element by element, like words in a dictionary
single = (5,)                         # a one-element tuple needs the comma
assert len(single) == 1
```

Assigning to `point[0]` is a `TypeError`. That is the point of a tuple: a value that is guaranteed not to change can safely be used as a dictionary key, which the next lesson relies on.

**A table is a list of lists.** `grid[r][c]` is row `r`, column `c`.

```python
grid = [[0] * 3 for _ in range(2)]    # 2 rows, 3 columns, each row a separate list
grid[1][2] = 7
assert grid == [[0, 0, 0], [0, 0, 7]]
```

## 5. Worked example

Find the second largest value in a list of at least two distinct integers, in one pass and without sorting.

Keep two variables: the largest value seen so far and the second largest. For each new value there are three cases.

| New value compared with | Action |
| --- | --- |
| greater than `largest` | old `largest` becomes `second`, new value becomes `largest` |
| between `second` and `largest` | new value becomes `second` |
| at most `second`, or equal to `largest` | nothing changes |

Trace on `[4, 9, 2, 7]`, starting with the first two elements in order:

| Value | `largest` | `second` |
| --- | --- | --- |
| start (4, 9) | 9 | 4 |
| 2 | 9 | 4 |
| 7 | 9 | 7 |

```python
def second_largest(items: list[int]) -> int:
    """Return the second largest distinct value. Precondition: at least two distinct values."""
    largest = second = None
    for value in items:
        if largest is None or value > largest:
            largest, second = value, largest
        elif value != largest and (second is None or value > second):
            second = value
    return second


assert second_largest([4, 9, 2, 7]) == 7
assert second_largest([1, 2]) == 1
assert second_largest([5, 5, 3]) == 3            # duplicates of the largest do not count
assert second_largest([-1, -5, -3]) == -3        # negative values

# Check against a simple method on every short list of small values.
from itertools import product

for length in range(2, 6):
    for values in product(range(4), repeat=length):
        if len(set(values)) >= 2:
            assert second_largest(list(values)) == sorted(set(values))[-2]
```

One pass, two variables: time proportional to n and constant extra space. Sorting first would also work, but costs about n log n and either changes the list or copies it.

## 6. Try it

```python-run
scores = [72, 85, 91, 60]
print(scores[0], scores[-1], scores[1:3])

scores.append(78)
scores[0] = 75
print(scores)

print(sorted(scores))     # a new list
print(scores)             # unchanged
print(scores.sort())      # sorts in place and returns None
print(scores)

total = 0
for score in scores:
    total += score
print("average:", total / len(scores))

print([s for s in scores if s >= 80])
```

Things to try: print `scores[10]`, then `scores[2:10]`. Assign `result = scores.append(5)` and print `result`.

## 7. Common mistakes

- **Using the result of a method that returns `None`.** `items = items.sort()` and `items = items.append(x)` both replace your list with `None`.
- **Indexing one past the end.** The last valid index is `len(items) - 1`.
- **Removing from the front in a loop.** `items.pop(0)` is linear, so doing it n times is quadratic. Use an index that moves, or a `collections.deque`.
- **Testing membership in a list inside a loop.** `x in items` is linear. For repeated membership tests use a set, the subject of the next lesson.
- **Building a grid with `[[0] * 3] * 2`.** Both rows are the *same* list, so changing one changes both. Use a comprehension. Lesson 3 explains why.
- **Modifying a list while looping over it.** Elements are skipped. Loop over a copy or build a new list.

## 8. Practice

1. For `items = [5, 3, 8, 1]`, give the list after each of: `items.append(4)`, `items.insert(1, 9)`, `items.pop()`, `items.pop(0)`, applied in that order.
2. Write `count_greater(items, threshold)` with a loop, then again with a comprehension and `len`.
3. Which is faster for a list of a million elements, and why: `items.pop()` or `items.pop(0)`?
4. Write `reverse_in_place(items)` that reverses a list by swapping elements from the two ends inwards, without building a new list.
5. Write `transpose(grid)` that turns a table with r rows and c columns into one with c rows and r columns.

Then solve **Second largest** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can say which list operations are constant time and which are linear, and why.
- [ ] I can explain the difference between `sorted(items)` and `items.sort()`.
- [ ] I can choose between a list and a tuple for a given purpose.
- [ ] I can create a table as a list of lists without the rows being shared.

## 10. Summary

A list is a mutable sequence stored as an array of references: access by index and `append` are fast, while inserting or removing at the front and searching by value are linear. A tuple is an immutable sequence, used for fixed groups of values. Knowing the cost of each list operation is the first step in analysing any algorithm written with them.

## 11. Further study

- The Python Tutorial, section 5.1, "More on Lists", and section 5.3, "Tuples and Sequences".
- Python Wiki, "TimeComplexity", for the cost of every operation on the built-in collections.
- Python documentation, "Sorting Techniques", on `sorted`, `sort` and key functions.

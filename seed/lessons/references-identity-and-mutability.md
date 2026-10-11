## 1. Motivation

Sooner or later every Python programmer writes a function that changes a list it was only supposed to read, or builds a grid whose rows all change together. These are not random glitches. They follow from one rule about how names relate to objects. Learn the rule once and a whole class of bugs disappears. It also decides something this course cares about: whether an algorithm works *in place* or needs a copy, which is the difference between constant and linear extra memory.

## 2. Prerequisites

Lessons 1 and 2 of this module. From Python Module P1, the picture of a variable as a label tied to a value.

## 3. The idea

Everything in Python is an **object**. A variable is a **reference** to an object: a label tied to it.

**Assignment never copies an object.** `b = a` ties a second label to the *same* object. Whether you can notice the difference depends on the kind of object.

- An **immutable** object cannot be changed after it is created: `int`, `float`, `bool`, `str`, `tuple`. Two labels on the same immutable object are harmless, because nobody can change it.
- A **mutable** object can be changed in place: `list`, `dict`, `set`. If two labels are tied to the same list and the list is changed through one of them, the change is visible through the other.

Two names for one object are called **aliases**.

There are two different questions you can ask about two values, and they have different operators.

| Question | Operator | Meaning |
| --- | --- | --- |
| Do they have the same content? | `==` | **Equality** |
| Are they the very same object? | `is` | **Identity** |

Two different lists can be equal. Two aliases are always equal and always identical.

## 4. Syntax and semantics

```python
a = [1, 2, 3]
b = a                    # alias: no copy is made
c = [1, 2, 3]            # a different list with the same content

assert a == b and a is b
assert a == c and a is not c

b.append(4)              # changes the one list that both a and b refer to
assert a == [1, 2, 3, 4]
assert c == [1, 2, 3]    # the separate list is unaffected
```

**Rebinding is not mutation.** Assigning to a name moves the label. Calling a method that modifies, or assigning to an index, changes the object.

```python
x = [1, 2]
y = x
y = y + [3]              # builds a NEW list and moves the label y to it
assert x == [1, 2] and y == [1, 2, 3]

p = [1, 2]
q = p
q += [3]                 # for a list, += changes the object in place
assert p == [1, 2, 3] and p is q
```

The last two examples look almost the same and behave differently. `y + [3]` creates a new list. `q += [3]` extends the existing one. When aliases are involved, know which you are using.

With an immutable value there is nothing to confuse, because every operation creates a new object:

```python
s = "abc"
t = s
t += "d"                 # strings cannot change, so this builds a new string
assert s == "abc" and t == "abcd"
```

**Copying.** To get an independent list, copy it explicitly.

```python
original = [3, 1, 2]
copy = list(original)            # also: original[:] or original.copy()
copy.sort()
assert original == [3, 1, 2] and copy == [1, 2, 3]
```

These copies are **shallow**: a new outer list whose elements are the *same* objects as before. For a list of numbers or strings that is all you need. For a list of lists, the inner lists are still shared.

```python
import copy as copy_module

grid = [[1, 2], [3, 4]]
shallow = list(grid)
deep = copy_module.deepcopy(grid)

grid[0][0] = 99
assert shallow[0][0] == 99       # the inner list is shared
assert deep[0][0] == 1           # fully independent
```

**Arguments are passed by reference to the object.** A parameter is a new label tied to the object the caller supplied. No copy is made, which is why passing a list of a million elements to a function costs nothing. It also means the function *can* change that list.

```python
def add_zero(items):
    items.append(0)              # mutates the caller's list


def replace_with_zero(items):
    items = [0]                  # rebinds the local label only


data = [1, 2]
add_zero(data)
assert data == [1, 2, 0]
replace_with_zero(data)
assert data == [1, 2, 0]         # unchanged: only the local name moved
```

A function that changes its argument has a **side effect**. Side effects are sometimes exactly what is wanted: sorting *in place* is one. They must be stated in the docstring, because the caller cannot see them from the call.

**Use `is` only for `None`.** Write `if x is None`. For numbers, strings and everything else, compare with `==`.

## 5. Worked example

Two famous traps, both explained by the rule "assignment never copies".

**Trap 1: the shared row.**

```python
bad = [[0] * 3] * 2              # one inner list, referred to twice
bad[0][0] = 7
assert bad == [[7, 0, 0], [7, 0, 0]]
assert bad[0] is bad[1]          # the two rows are the same object

good = [[0] * 3 for _ in range(2)]      # the inner expression runs twice
good[0][0] = 7
assert good == [[7, 0, 0], [0, 0, 0]]
assert good[0] is not good[1]
```

`[row] * 2` makes a list holding two references to the single object `row`. The comprehension evaluates `[0] * 3` once per row, creating a separate list each time.

Why is `[0] * 3` itself safe? It also repeats a reference, but to the integer 0, which is immutable. Assigning `row[0] = 7` moves one slot to a new object and leaves the others alone.

**Trap 2: the mutable default argument.** A default value is created once, when the function is defined, and reused on every call.

```python
def append_bad(value, bucket=[]):
    bucket.append(value)
    return bucket


assert append_bad(1) == [1]
assert append_bad(2) == [1, 2]            # the same list as before


def append_good(value, bucket=None):
    if bucket is None:
        bucket = []                       # a fresh list on every call
    bucket.append(value)
    return bucket


assert append_good(1) == [1]
assert append_good(2) == [2]
```

**In place or not: two versions of the same task.** Both are correct. They make different promises, and the docstring says which.

```python
def sorted_copy(items: list[int]) -> list[int]:
    """Return a new sorted list. The argument is not modified."""
    result = list(items)         # linear extra memory
    result.sort()
    return result


def sort_in_place(items: list[int]) -> None:
    """Sort items in place. Returns None."""
    items.sort()                 # constant extra memory


numbers = [3, 1, 2]
assert sorted_copy(numbers) == [1, 2, 3] and numbers == [3, 1, 2]
assert sort_in_place(numbers) is None and numbers == [1, 2, 3]
```

When a practice problem says "the argument must not be modified", it is asking for the first kind.

## 6. Try it

```python-run
a = [1, 2, 3]
b = a            # alias
c = list(a)      # copy

b.append(4)
print("a:", a)
print("b:", b)
print("c:", c)
print("a is b:", a is b, "| a == c:", a == c, "| a is c:", a is c)


def double_all(items):
    for i in range(len(items)):
        items[i] *= 2


double_all(a)
print("after double_all(a):", a, b, c)
```

Things to try: before reading the output, write down what each line prints. Then change `b = a` to `b = a[:]` and predict again.

## 7. Common mistakes

- **Thinking `b = a` copies a list.** It creates an alias. Use `list(a)`.
- **Mutating an argument without saying so.** State it in the docstring, or work on a copy.
- **A mutable default argument.** Use `None` and create the object inside the function.
- **`[[0] * c] * r` for a grid.** All rows are the same list. Use a comprehension.
- **Comparing with `is` where `==` is meant.** `is` tests identity. It can appear to work for small numbers and then fail for larger ones.
- **Assuming a shallow copy is independent.** Nested lists are still shared. Use `copy.deepcopy` when you need full independence.

## 8. Practice

1. After `a = [1, 2]`, `b = a`, `a = a + [3]`, `b.append(4)`, what are `a` and `b`? Explain each step with labels and objects.
2. Does this function change the caller's list? `def clear(items): items = []`. Rewrite it so that it does.
3. Write `without_first(items)` that returns a new list without the first element, and `drop_first(items)` that removes it in place. Give each a docstring.
4. Explain why `[[]] * 3` is a trap but `[0] * 3` and `("",) * 3` are safe.
5. A function receives a list of a million numbers and only reads it. How much is copied when it is called?

Then solve **Remove duplicates** and **Second largest** if you have not yet. Both state whether the argument may be modified.

## 9. Check your understanding

- [ ] I can explain why `b = a` followed by `b.append(...)` changes `a`.
- [ ] I can tell equality from identity, and say when to use `is`.
- [ ] I can predict whether a function call can change its argument.
- [ ] I can make a copy of a list, and say what a shallow copy still shares.

## 10. Summary

A variable is a reference to an object, and assignment never copies. Immutable objects cannot change, so sharing them is safe. Mutable objects can change, so a change made through one name is seen through every alias. `==` compares content and `is` compares identity. A function receives references to its arguments: it can mutate a list it is given, and should say so if it does.

## 11. Further study

- Python Language Reference, section 3.1, "Objects, values and types".
- Python documentation, the `copy` module, on shallow and deep copies.
- Python FAQ, "Why did changing list 'y' also change list 'x'?", for another explanation of aliasing.
- Ned Batchelder, "Facts and Myths about Python Names and Values" (PyCon 2015), a clear illustrated account of this whole topic.

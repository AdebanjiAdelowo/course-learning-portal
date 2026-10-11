## 1. Motivation

Every algorithm in this course is, in the end, a sequence of assignments and comparisons. If you misread one line, every line you trace after it is wrong. This lesson fixes the meaning of the smallest pieces: values, the names that refer to them, and the types that decide what can be done with them.

## 2. Prerequisites

None. This is the first lesson. You do not need to have programmed before. You can run every example on this page with the **Run code** button, so nothing has to be installed yet.

## 3. The idea

A **value** is a piece of data: the number `7`, the text `"Ada"`, the truth value `True`.

Every value has a **type**, which says what kind of thing it is and what operations make sense for it. You can add two numbers. You cannot divide a word by a word.

A **variable** is a *name* that refers to a value. It helps to picture a label tied to an object, not a box with something inside it:

- `count = 7` ties the label `count` to the value `7`.
- `count = 8` unties the label and ties it to `8`. The value `7` is not changed. Values such as numbers and text can never be changed. Only the label moved.

The label picture looks like a small detail now. It becomes essential in Python Module P2, when two labels are tied to the same list.

| Type | Name in Python | Examples | Used for |
| --- | --- | --- | --- |
| Integer | `int` | `0`, `7`, `-12`, `10**18` | Counting, indices |
| Floating point | `float` | `2.5`, `0.1`, `3.0` | Measurements, averages |
| Boolean | `bool` | `True`, `False` | Answers to yes/no questions |
| String | `str` | `"Ada"`, `"7"`, `""` | Text |
| None | `NoneType` | `None` | "No value here" |

## 4. Syntax and semantics

An **assignment statement** has a name on the left and an expression on the right:

```text
name = expression
```

Python works out the value of the expression first, then ties the name to that value. The `=` sign is an instruction, not a claim that two things are equal. That is why `count = count + 1` makes sense: work out `count + 1` using the old value, then move the label.

Rules for names: letters, digits and underscores, not starting with a digit. `total_cost` is the conventional style. Names are case-sensitive, so `total` and `Total` are different names.

The built-in function `type` reports the type of a value, and `int`, `float` and `str` convert between types.

```python
count = 7
price = 2.5
name = "Ada"
ready = True
nothing = None

assert type(count) is int
assert type(price) is float
assert type(name) is str
assert type(ready) is bool
assert nothing is None

# Conversion creates a new value of another type.
assert int("42") == 42          # text to integer
assert str(42) == "42"          # integer to text
assert float(3) == 3.0
assert int(3.9) == 3            # cut off towards zero, not rounded
assert "7" != 7                 # text and number are never equal
```

Two facts about numbers will matter throughout the course.

**Integers are exact and unlimited.** Python integers grow as large as memory allows. There is no overflow, unlike many other languages.

**Floats are approximate.** A float is stored in binary with a fixed number of digits, and most decimal fractions cannot be written exactly that way. The famous consequence:

```python
assert 2**100 == 1267650600228229401496703205376    # exact, however large
assert 0.1 + 0.2 != 0.3                              # floats are approximate
assert abs((0.1 + 0.2) - 0.3) < 1e-9                 # so compare with a tolerance
```

This is why the algorithms in this course use integers wherever they can.

## 5. Worked example

Trace this program by hand. Write one row for each line, with the value of every name after the line has run.

```python
a = 5
b = a
a = a + 2
c = a * b
```

| After line | `a` | `b` | `c` |
| --- | --- | --- | --- |
| `a = 5` | 5 | | |
| `b = a` | 5 | 5 | |
| `a = a + 2` | 7 | 5 | |
| `c = a * b` | 7 | 5 | 35 |

The important row is the third. Changing `a` did not change `b`. The line `b = a` tied `b` to the *value* `a` had at that moment, the integer 5. It did not link the two names together.

```python
assert (a, b, c) == (7, 5, 35)
```

Swapping two names needs a third label, so that neither value is lost. Python also allows both assignments at once:

```python
x, y = 3, 9
temporary = x       # keep the old x
x = y
y = temporary
assert (x, y) == (9, 3)

x, y = y, x         # the same swap, written the Python way
assert (x, y) == (3, 9)
```

## 6. Try it

Run this, then change the values and predict the output before running again.

```python-run
count = 7
price = 2.5
name = "Ada"

print(count, type(count))
print(price, type(price))
print(name, type(name))

total = count * price
print("total:", total, type(total))

count = count + 1
print("count is now", count)
```

Things to try: replace `7` with `"7"` and read the error. Print `10**30`. Print `0.1 + 0.2`.

## 7. Common mistakes

- **Reading `=` as "equals".** `x = x + 1` is an instruction to compute and re-label. The test for equality is `==`, which is covered in the lesson on conditionals.
- **Confusing a number with its text.** `"7" + "7"` is `"77"`, and `"7" + 7` is an error. Convert explicitly with `int` or `str`.
- **Expecting `int` to round.** `int(3.9)` is `3`. Use `round(3.9)` to get `4`.
- **Comparing floats with `==`.** Compare the absolute difference with a small tolerance, or avoid floats.
- **Using a name before it has a value.** Python reports a `NameError`. The cause is usually a spelling difference between two lines.

## 8. Practice

1. Without running it, give the final values of `p`, `q` and `r` after `p = 4`, `q = p + 1`, `p = q * 2`, `r = p - q`.
2. What are the type and value of each expression: `int("12") + 3`, `str(12) + "3"`, `float("2") * 2`, `int(-2.7)`?
3. Write three lines that rotate the values of `a`, `b` and `c`: `a` gets the old `b`, `b` the old `c`, and `c` the old `a`. Then do it in one line.
4. Explain to a friend, in two sentences, why `0.1 + 0.2 == 0.3` is `False`.

Then solve **Split a duration** in the practice problems after the next lesson, which introduces the operators it needs.

## 9. Check your understanding

- [ ] I can say what a value, a type and a variable are, and how they differ.
- [ ] I can trace a sequence of assignments in a table.
- [ ] I can convert between `int`, `float` and `str`, and predict what `int` does to `3.9`.
- [ ] I can explain why integers are exact and floats are not.

## 10. Summary

A value has a type. A variable is a name tied to a value, and assignment moves the name to a new value without changing the old one. Integers are exact and unbounded. Floats are approximations and should not be compared with `==`. Tracing a program in a table of names and values is the basic tool for understanding any algorithm.

## 11. Further study

- The Python Tutorial, section 3.1, "Using Python as a Calculator": numbers and text.
- The Python Tutorial, section 15, "Floating-Point Arithmetic: Issues and Limitations", for why `0.1` cannot be stored exactly.
- Python documentation, "Built-in Types", for the complete list of operations on each type.

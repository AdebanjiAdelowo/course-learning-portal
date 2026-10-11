## 1. Motivation

Algorithms compute. Binary search computes a middle index. A digit algorithm peels off the last digit of a number. Both depend on two operators that many beginners have never used: floor division and remainder. This lesson covers the operators you will read on almost every page of the course, and the order in which Python applies them.

## 2. Prerequisites

Lesson 1 of this module: values, variables and the types `int`, `float`, `bool` and `str`.

## 3. The idea

An **expression** is anything that has a value: `7`, `count + 1`, `len(name) * 2`. Python **evaluates** an expression by working out the values of its parts and combining them with **operators**.

There are three families of operators to know now.

- **Arithmetic** operators take numbers and give a number.
- **Comparison** operators take two values and give a `bool`.
- **Boolean** operators combine truth values. They are the subject of the next lesson.

## 4. Syntax and semantics

| Operator | Meaning | Example | Value |
| --- | --- | --- | --- |
| `+` `-` `*` | Add, subtract, multiply | `7 * 3` | `21` |
| `/` | True division, always a `float` | `7 / 2` | `3.5` |
| `//` | Floor division, rounds **down** | `7 // 2` | `3` |
| `%` | Remainder | `7 % 2` | `1` |
| `**` | Power | `2 ** 10` | `1024` |
| `==` `!=` | Equal, not equal | `7 == 7.0` | `True` |
| `<` `<=` `>` `>=` | Order | `3 <= 3` | `True` |

**Floor division and remainder belong together.** For integers `a` and `b` with `b` not zero, Python guarantees

$$
a = (a \mathbin{//} b) \cdot b + (a \bmod b), \qquad 0 \le a \bmod b < b \ \text{ when } b > 0 .
$$

In words: `a // b` is how many whole times `b` fits into `a`, and `a % b` is what is left over.

```python
assert 17 // 5 == 3 and 17 % 5 == 2          # 17 = 3 * 5 + 2
assert 20 // 5 == 4 and 20 % 5 == 0          # divides exactly
assert 3 // 5 == 0 and 3 % 5 == 3            # smaller than the divisor

# Rounding is DOWN, towards minus infinity, not towards zero.
assert -7 // 2 == -4
assert -7 % 2 == 1                           # -7 = (-4) * 2 + 1

# The identity holds for every pair, including negative numbers.
for a in range(-20, 21):
    for b in (1, 2, 3, 7):
        assert a == (a // b) * b + a % b
        assert 0 <= a % b < b
```

Three patterns built on these two operators appear again and again.

```python
n = 4729
assert n % 10 == 9            # the last decimal digit
assert n // 10 == 472         # the number without its last digit
assert n % 2 == 1             # odd: remainder 1 when divided by 2
assert 4730 % 2 == 0          # even

lo, hi = 4, 11
assert (lo + hi) // 2 == 7    # the middle index used by binary search
```

**Precedence** decides which operator is applied first when there are no brackets.

| Applied first | | | Applied last |
| --- | --- | --- | --- |
| `**` | `*` `/` `//` `%` | `+` `-` | comparisons |

Operators in the same group are applied from left to right, except `**`, which is applied from right to left. When in doubt, add brackets. They cost nothing and make the intention visible.

```python
assert 2 + 3 * 4 == 14            # multiplication first
assert (2 + 3) * 4 == 20
assert 2 ** 3 ** 2 == 512         # 3 ** 2 first, then 2 ** 9
assert -3 ** 2 == -9              # power first, then the minus sign
assert 10 - 4 - 3 == 3            # left to right
assert 7 + 1 == 2 * 4             # arithmetic before comparison
```

Python has shorthand for updating a name: `total += 5` means `total = total + 5`. The same exists for `-=`, `*=`, `//=` and `%=`.

## 5. Worked example

Convert 3725 seconds into hours, minutes and seconds.

There are 3600 seconds in an hour. `3725 // 3600` is `1`, so one whole hour, and `3725 % 3600` is `125` seconds left over. There are 60 seconds in a minute. `125 // 60` is `2` minutes, and `125 % 60` is `5` seconds.

| Step | Expression | Value |
| --- | --- | --- |
| Hours | `3725 // 3600` | 1 |
| Seconds left | `3725 % 3600` | 125 |
| Minutes | `125 // 60` | 2 |
| Seconds | `125 % 60` | 5 |

```python
total = 3725
hours = total // 3600
remaining = total % 3600
minutes = remaining // 60
seconds = remaining % 60
assert (hours, minutes, seconds) == (1, 2, 5)
assert hours * 3600 + minutes * 60 + seconds == total     # nothing was lost
```

The last line is a check you should get used to writing: put the pieces back together and confirm that you get what you started with.

## 6. Try it

Predict each line before you run it.

```python-run
print(17 / 5)      # true division
print(17 // 5)     # floor division
print(17 % 5)      # remainder
print(-17 // 5)    # rounds down, so this is not -3
print(2 ** 10)

n = 4729
print("last digit:", n % 10)
print("without it:", n // 10)
print("is even:", n % 2 == 0)

print(2 + 3 * 4, (2 + 3) * 4)
```

Things to try: divide by zero and read the error. Compute `7 // 2` and `7 / 2` and compare the types with `type(...)`.

## 7. Common mistakes

- **Using `/` where `//` is needed.** `items[(lo + hi) / 2]` fails, because an index must be an integer and `/` always gives a float.
- **Assuming `//` rounds towards zero.** `-7 // 2` is `-4`. This differs from C and Java.
- **Forgetting precedence.** `a + b / 2` is not the average of `a` and `b`. Write `(a + b) / 2`.
- **Confusing `=` and `==`.** `=` assigns. `==` asks a question and gives `True` or `False`.
- **Chaining powers.** `2 ** 3 ** 2` is `2 ** 9`, not `8 ** 2`.

## 8. Practice

1. Evaluate by hand: `23 // 4`, `23 % 4`, `-23 // 4`, `-23 % 4`, `4 // 23`, `4 % 23`. Check that each pair satisfies the identity in section 4.
2. Given a three-digit number `n`, write expressions for its hundreds digit, its tens digit and its units digit.
3. Without running it, give the value of `2 + 2 * 2 ** 2 // 3 % 3`. Then add brackets that show the order Python uses.
4. A clock shows `h` hours on a 24-hour dial. Write an expression for the hour it shows `k` hours later.

Then solve **Split a duration** and **Sum of digits** in the practice problems for this module. You will need a loop for the second one, so come back to it after lesson 4 if you prefer.

## 9. Check your understanding

- [ ] I can state the identity that connects `//` and `%`.
- [ ] I can predict `//` and `%` for a negative left operand.
- [ ] I can extract the last digit of a number and remove it.
- [ ] I can add brackets to an expression to show the order of evaluation.

## 10. Summary

`/` gives a float, `//` rounds down to an integer, and `%` gives the remainder, with `a == (a // b) * b + a % b` always true. Powers bind tightest, then multiplication and division, then addition and subtraction, then comparisons. Use brackets whenever the order is not obvious at a glance.

## 11. Further study

- Python Language Reference, section 6.17, "Operator precedence", for the complete table.
- Python Language Reference, section 6.7, "Binary arithmetic operations", for the exact definition of `//` and `%`.
- The Python Tutorial, section 3.1.1, "Numbers".

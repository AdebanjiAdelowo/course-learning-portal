## Idea

Turn each part of the rule into a condition, then decide how the conditions combine. A year is a leap year in exactly two situations: it is divisible by 4 but not by 100, or it is divisible by 400.

## Solution

```python
def is_leap_year(year: int) -> bool:
    return (year % 4 == 0 and year % 100 != 0) or year % 400 == 0


assert is_leap_year(2024)
assert not is_leap_year(2023)
assert not is_leap_year(1900)
assert is_leap_year(2000)
```

## Why it is correct

Every year falls into exactly one of four groups. The table shows what the rule says for each, and what the expression evaluates to.

| Group | Example | Rule says | `%4==0 and %100!=0` | `%400==0` | Result |
| --- | --- | --- | --- | --- | --- |
| Not divisible by 4 | 2023 | not leap | False | False | False |
| Divisible by 4, not by 100 | 2024 | leap | True | False | True |
| Divisible by 100, not by 400 | 1900 | not leap | False | False | False |
| Divisible by 400 | 2000 | leap | False | True | True |

The expression agrees with the rule in all four groups, and there are no other groups, so it is correct for every year.

The same logic written as nested decisions, which some people find easier to read, must agree with it everywhere:

```python
def is_leap_year_stepwise(year: int) -> bool:
    if year % 400 == 0:
        return True
    if year % 100 == 0:
        return False
    return year % 4 == 0


for year in range(1, 4001):
    assert is_leap_year(year) == is_leap_year_stepwise(year)
```

## Complexity

At most three remainder operations: constant time and space.

## Common mistakes

- Testing only `year % 4 == 0`. That is wrong for 1900, 2100 and every other century year not divisible by 400.
- Writing `year % 4 == 0 and year % 100 != 0 or year % 400 == 0` without brackets. It happens to give the same result, because `and` binds more tightly than `or`, but the brackets make the intention clear to a reader.
- Returning the strings `"True"` and `"False"`, or 1 and 0. The problem asks for a `bool`.

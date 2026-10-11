## Idea

A string is a palindrome when its first character equals its last, its second equals its second-to-last, and so on. Keep one index at each end, compare, and move both inwards. A single mismatch settles the answer.

## Solution

```python
def is_palindrome(text: str) -> bool:
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True


assert is_palindrome("level")
assert is_palindrome("noon")
assert not is_palindrome("search")
assert is_palindrome("") and is_palindrome("x")
assert not is_palindrome("Level")          # case matters
```

## Why it is correct

**Invariant.** At the start of each iteration, `text[k] == text[n - 1 - k]` for every `k < left`, where `n` is the length, and `right == n - 1 - left`.

It holds at the start, with `left = 0`, because there is no `k` below 0. If the two characters under the indices are equal and both indices move one step, it holds for the next iteration.

- If the loop returns `False`, it has found a position whose mirror image differs: a direct counterexample.
- If the loop ends, `left >= right`. Every pair of mirrored positions has been compared and found equal. When the length is odd, the middle character is its own mirror image and needs no comparison.

For lengths 0 and 1 the condition `left < right` is false immediately, and the function returns `True`.

**Termination.** `right - left` decreases by 2 on every pass, so the loop ends.

A check against the one-line method on every short string over a small alphabet:

```python
from itertools import product

for length in range(0, 7):
    for letters in product("abc", repeat=length):
        word = "".join(letters)
        assert is_palindrome(word) == (word == word[::-1])
```

## Complexity

At most `n // 2` comparisons: linear time. Only two integers are stored: constant extra space. The one-line version `text == text[::-1]` is also linear in time, but builds a copy of the whole string.

## Common mistakes

- Using `while left <= right`. It still gives the right answer, but compares the middle character with itself.
- Starting `right` at `len(text)`, one past the end, which raises an `IndexError`.
- Returning `True` inside the loop after the first matching pair.

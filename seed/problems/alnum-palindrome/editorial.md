## Approach and correctness

Move `lo` forwards and `hi` backwards. Invariant: the kept characters before `lo` match, in mirror order, the kept characters after `hi`. A character that is not a letter or digit takes no part in the comparison, so skipping it keeps the invariant. When both pointers rest on kept characters they must be equal ignoring case; a mismatch proves the sequence is not a palindrome. When they cross, every kept pair has matched.

## Complexity

Every iteration moves at least one pointer inwards, so there are at most `n` iterations: Theta(n) time and O(1) auxiliary space. A cleaned copy would use Theta(n) extra space for the same time.

## Boundaries

Empty strings and strings of only punctuation return `True`. Mixed case such as `"Ab"` returns `False` only because the letters differ; `"aA"` returns `True`. Digits count: `"0P"` is not a palindrome. Python's `isalnum` also accepts non-ASCII letters, so the reference checks `isascii` to match the contract exactly.

## Reference implementation

```python
def alnum_palindrome(text):
    def keep(ch):
        return ch.isascii() and ch.isalnum()

    lo, hi = 0, len(text) - 1
    while lo < hi:
        if not keep(text[lo]):
            lo += 1
        elif not keep(text[hi]):
            hi -= 1
        elif text[lo].lower() != text[hi].lower():
            return False
        else:
            lo += 1
            hi -= 1
    return True

assert alnum_palindrome("No lemon, no melon")
assert not alnum_palindrome("race a car")
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

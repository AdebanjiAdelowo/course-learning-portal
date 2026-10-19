## Contract

Implement `alnum_palindrome(text)`.

`text` is a string of at most 200 printable ASCII characters. Consider only the ASCII letters and digits, comparing letters without regard to case. Return `True` if that sequence reads the same forwards and backwards, otherwise `False`. A sequence with no letters or digits counts as a palindrome. Compare from both ends with two indices; building a cleaned copy of the string is correct but does not practise the technique.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`alnum_palindrome("No lemon, no melon")` returns `True`.

`alnum_palindrome("race a car")` returns `False`.

`alnum_palindrome("")` returns `True`.

## Reasoning exercise

State what the region outside `[lo, hi]` is known to satisfy, and explain why skipping a punctuation character on one side never skips a comparison that matters.

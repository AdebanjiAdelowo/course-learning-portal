## Contract

Implement `longest_run_after_replacements(text, k)`.

`text` has at most 200 uppercase letters `A`..`Z`, and `k` is an integer with `0 <= k <= len(text)`. You may replace at most `k` characters of a substring with any letters. Return the length of the longest substring that can be turned into a single repeated letter this way. Use a variable-size window in linear time.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`longest_run_after_replacements("ABAB", 2)` returns `4`.

`longest_run_after_replacements("AABABBA", 1)` returns `4`.

`longest_run_after_replacements("ABCD", 0)` returns `1`.

## Reasoning exercise

Express the validity of a window in terms of its length and the count of its most frequent letter, and explain why validity is monotone under shrinking.

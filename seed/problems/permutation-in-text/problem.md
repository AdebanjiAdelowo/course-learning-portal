## Contract

Implement `contains_permutation(pattern, text)`.

`pattern` has between 1 and 26 lowercase letters `a`..`z`, and `text` has at most 200 lowercase letters. Return `True` if some contiguous substring of `text` uses exactly the same letters as `pattern`, with the same counts, in any order. Otherwise return `False`. Use a fixed-size window with letter counts.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`contains_permutation("ab", "eidbaooo")` returns `True`, because of `"ba"`.

`contains_permutation("ab", "eidboaoo")` returns `False`.

`contains_permutation("abc", "ab")` returns `False`.

## Reasoning exercise

Explain why the window size is fixed here even though the problem is about strings, and how to update the counts in constant time per step.

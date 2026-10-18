## Contract

Implement `smallest_covering_window(text, pattern)`.

`text` has at most 200 ASCII letters and `pattern` has between 1 and 50 ASCII letters; case matters. Return the shortest contiguous substring of `text` that contains every character of `pattern` at least as many times as it occurs in `pattern`. If several substrings are equally short, return the one that starts first. Return `""` if no substring qualifies. Use a variable-size window in linear time.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`smallest_covering_window("ADOBECODEBANC", "ABC")` returns `"BANC"`.

`smallest_covering_window("a", "aa")` returns `""`, because the pattern needs two copies of `a`.

`smallest_covering_window("xyz", "z")` returns `"z"`.

## Reasoning exercise

Explain what the counter `missing` measures, why it changes only when a needed character crosses its required count, and why the leftmost shortest window is the one recorded.

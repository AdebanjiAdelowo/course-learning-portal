## Contract

Implement `longest_distinct_run(text)`.

`text` is a string of at most 200 printable ASCII characters; spaces and punctuation count as characters, and case matters. Return the length of the longest contiguous substring in which no character appears twice. Use a variable-size window in linear time.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`longest_distinct_run("abcabcbb")` returns `3`.

`longest_distinct_run("")` returns `0`.

`longest_distinct_run("bbbb")` returns `1`.

## Reasoning exercise

The reference jumps `left` directly past the previous copy of a character. Explain why the check `last_seen[ch] >= left` is needed, using the input `"abba"`.

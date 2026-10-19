## Contract

Implement `shortest_reaching_sum(values, target)`.

`values` is a list of at most 100 **positive** integers within 1..10000, and `target` is an integer within 1..1000000. Return the length of the shortest contiguous run whose sum is at least `target`, or `0` if no run reaches it. Use a variable-size window in linear time.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`shortest_reaching_sum([2, 3, 1, 2, 4, 3], 7)` returns `2`, from `[4, 3]`.

`shortest_reaching_sum([1, 1, 1], 5)` returns `0`.

`shortest_reaching_sum([8], 3)` returns `1`.

## Reasoning exercise

Find an input with a negative value on which shrinking a window as soon as its sum reaches the target gives the wrong answer, and explain which step of the correctness argument fails.

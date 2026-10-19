## Contract

Implement `best_window_sum(values, k)`.

`values` is a list of between 1 and 100 integers within -1000..1000, and `k` satisfies `1 <= k <= len(values)`. Return the largest sum of `k` consecutive values. Negative values are allowed. Update a running sum in constant time per position instead of re-adding `k` values for every window.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`best_window_sum([2, 1, 5, 1, 3, 2], 3)` returns `9`, from `[5, 1, 3]`.

`best_window_sum([-4, -2, -7], 2)` returns `-6`.

`best_window_sum([6], 1)` returns `6`.

## Reasoning exercise

Explain why negative values do not break a fixed-size window, even though they break the variable-size window for minimum length.

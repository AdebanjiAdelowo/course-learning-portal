## Contract

Implement `prefix_totals(items)`.

At most 100 integers within -1000..1000. Return n+1 prefix sums, beginning with zero. Do not mutate the input.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`prefix_totals([])` returns `[0]`.

`prefix_totals([3, -2, 5])` returns `[0, 3, 1, 6]`.

`prefix_totals([7])` returns `[0, 7]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

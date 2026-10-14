## Contract

Implement `range_totals(items, queries)`.

At most 100 integers within -1000..1000 and 100 queries. Each query is [left,right] with 0 <= left <= right <= len(items), denoting the half-open interval. Return sums in query order without mutating either input.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`range_totals([], [[0, 0]])` returns `[0]`.

`range_totals([3, -2, 5], [[0, 3], [1, 3], [2, 2]])` returns `[6, 3, 0]`.

`range_totals([7], [[0, 1], [0, 0]])` returns `[7, 0]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

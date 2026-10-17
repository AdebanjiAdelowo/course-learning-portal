## Contract

Implement `apply_updates(length, updates)`.

0 <= length <= 100. Begin with length zeros. At most 100 updates [left,right,value], with 0 <= left <= right <= length and -1000 <= value <= 1000. Add value to each position in the half-open interval. Return the final array using difference markers and one materialization pass.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`apply_updates(0, [])` returns `[]`.

`apply_updates(4, [[0, 3, 2], [1, 4, -1]])` returns `[2, 1, 1, -1]`.

`apply_updates(3, [[1, 1, 5]])` returns `[0, 0, 0]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

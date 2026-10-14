## Contract

Implement `stable_nonzero(items)`.

At most 100 integers within -1000..1000. Compact retained nonzero values into the input's prefix using constant auxiliary space, then return that prefix as a JSON-compatible list. Preserve relative order. Output allocation is allowed; the compaction kernel must use read/write indices.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`stable_nonzero([])` returns `[]`.

`stable_nonzero([0, 4, 0, -2, 4])` returns `[4, -2, 4]`.

`stable_nonzero([0, 0])` returns `[]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

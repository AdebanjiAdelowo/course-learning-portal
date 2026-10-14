## Contract

Implement `reverse_segment(items, left, right)`.

At most 100 integers within -1000..1000. 0 <= left <= right <= n. Mutate the specified half-open segment in place, return the entire resulting list, and preserve values outside the segment. Use swaps rather than slicing reversal.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`reverse_segment([], 0, 0)` returns `[]`.

`reverse_segment([1, 2, 3, 4], 1, 3)` returns `[1, 3, 2, 4]`.

`reverse_segment([7], 0, 1)` returns `[7]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

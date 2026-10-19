## Contract

Implement `pair_sum_sorted(values, target)`.

`values` is a list of at most 100 integers in non-decreasing order, each within -1000..1000, and `target` is an integer. At most one pair of positions `i < j` satisfies `values[i] + values[j] == target`. Return that pair as `[i, j]` using zero-based positions, or `[]` when no pair exists. Use constant auxiliary space and a single pass of two indices; a nested loop or a dictionary of seen values does not meet the intent.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`pair_sum_sorted([1, 3, 4, 6, 9], 12)` returns `[1, 4]`, because 3 + 9 = 12.

`pair_sum_sorted([2, 5, 8], 4)` returns `[]`.

`pair_sum_sorted([-4, -1, 0, 7], -5)` returns `[0, 1]`.

## Reasoning exercise

State the invariant that justifies discarding an index after each comparison, and bound the total number of index moves. Passing the visible samples does not prove the invariant.

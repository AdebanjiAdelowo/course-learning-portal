## Contract

Implement `dedupe_sorted(values)`.

`values` is a list of at most 100 integers in non-decreasing order, each within -1000..1000. Rearrange it in place so that its first `k` positions hold each distinct value exactly once, in their original order, using constant auxiliary space in the rearranging loop. Return `values[:k]`. Allocating the returned prefix is allowed; building a separate set or list during the scan is not the intended method.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`dedupe_sorted([1, 1, 2, 3, 3])` returns `[1, 2, 3]`.

`dedupe_sorted([])` returns `[]`.

`dedupe_sorted([-2, -2, -2])` returns `[-2]`.

## Reasoning exercise

Write the invariant relating the written prefix to the processed input, and explain why sorted order lets you compare only with the last kept value.

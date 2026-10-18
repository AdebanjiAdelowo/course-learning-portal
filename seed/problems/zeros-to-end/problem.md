## Contract

Implement `zeros_to_end(values)`.

`values` is a list of at most 100 integers within -1000..1000. Rearrange it in place so that every nonzero value appears first, in its original relative order, followed by all the zeros. Return the same list object after rearranging. Use constant auxiliary space; creating a filtered copy does not meet the intent.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`zeros_to_end([0, 3, 0, 5, 7])` returns `[3, 5, 7, 0, 0]`.

`zeros_to_end([])` returns `[]`.

`zeros_to_end([4, 0, 0])` returns `[4, 0, 0]`.

## Reasoning exercise

Explain why swapping, rather than copying, leaves every zero in the suffix, and why the nonzero order is preserved.

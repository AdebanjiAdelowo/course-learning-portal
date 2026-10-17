## Contract

Implement `array_edit(items, operation, index, value)`.

At most 100 integers within -1000..1000. operation is "insert" or "delete". Insertion accepts 0 <= index <= n and inserts value (within -1000..1000). Deletion accepts 0 <= index < n, removes one value and ignores value. Return the edited sequence, preserving order and leaving the caller's input unchanged. Use explicit shifts rather than insert(), del or slice concatenation.

## Input and output

Arguments and results use ordinary JSON-compatible integers, lists and operation strings as specified. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`array_edit([], 'insert', 0, 4)` returns `[4]`.

`array_edit([2, 5, 9], 'insert', 1, 7)` returns `[2, 7, 5, 9]`.

`array_edit([2, 5, 9], 'delete', 1, 0)` returns `[2, 9]`.

## Reasoning exercise

State an invariant and distinguish auxiliary storage from the returned output. Tests check returned behavior; passing visible samples does not prove correctness or enforce the required algorithm.

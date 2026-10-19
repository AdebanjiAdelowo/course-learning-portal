## Contract

Implement `triplets_with_sum(values, target)`.

`values` is a list of at most 60 integers within -1000..1000, in any order, and `target` is an integer. Return every distinct triple of values `[a, b, c]` with `a <= b <= c` and `a + b + c == target`, where the three values come from three different positions. Two triples are the same if they contain the same values. Return the triples sorted in ascending lexicographic order, and return `[]` when there are none. Aim for O(n^2) time: sort once, then use two pointers for each fixed first value.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`triplets_with_sum([-2, 0, 1, 1, 2], 0)` returns `[[-2, 0, 2], [-2, 1, 1]]`.

`triplets_with_sum([1, 2, 3], 7)` returns `[]`.

`triplets_with_sum([0, 0, 0, 0], 0)` returns `[[0, 0, 0]]`.

## Reasoning exercise

Explain how sorting turns the problem into one pair-sum search per first value, and where duplicates must be skipped so that no triple is reported twice.

## Contract

Implement `max_container_area(heights)`.

`heights` is a list of at most 100 integers within 0..10000. Imagine a vertical wall of height `heights[i]` standing at position `i`. Two walls at positions `i < j` hold water up to the shorter wall, so their capacity is `(j - i) * min(heights[i], heights[j])`. Return the largest capacity over all pairs, or `0` when there are fewer than two walls. Solve it in linear time with two pointers.

## Input and output

Arguments and results are ordinary JSON-compatible values. The function is called directly; do not read standard input or print the answer instead of returning it.

## Examples

`max_container_area([1, 8, 6, 2, 5, 4, 8, 3, 7])` returns `49`, from the walls at positions 1 and 8.

`max_container_area([1, 1])` returns `1`.

`max_container_area([4, 3, 2, 1, 4])` returns `16`.

## Reasoning exercise

Argue why moving the pointer at the shorter wall can never discard the optimal pair. This is a different invariant from the pair-sum search, because nothing is sorted.

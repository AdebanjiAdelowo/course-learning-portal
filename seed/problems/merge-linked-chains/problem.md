## Contract and representation

Implement `merge_linked(left_items, right_items)`. Each values list has at most 100 integers within -1000..1000.

Both input lists are nondecreasing. Build two disjoint Node chains, then merge them by reusing their existing payload nodes. Choose the left chain on equal payloads. Return the serialized merged chain; do not sort concatenated Python lists.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`merge_linked([], [])` returns `[]`.

`merge_linked([1, 4, 4], [2, 4, 7])` returns `[1, 2, 4, 4, 4, 7]`.

`merge_linked([3], [])` returns `[3]`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

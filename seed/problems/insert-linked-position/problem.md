## Contract and representation

Implement `insert_linked(items, index, value)`. Each values list has at most 100 integers within -1000..1000.

0 <= index <= len(items); value within -1000..1000. Build a Node chain, locate the predecessor by following next, insert one new node and return serialized values. Preserve all original node identities within the constructed chain.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`insert_linked([], 0, 4)` returns `[4]`.

`insert_linked([2, 5, 9], 1, 7)` returns `[2, 7, 5, 9]`.

`insert_linked([7], 1, 8)` returns `[7, 8]`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

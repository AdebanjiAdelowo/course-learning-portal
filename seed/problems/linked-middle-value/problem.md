## Contract and representation

Implement `middle_value(items)`. Each values list has at most 100 integers within -1000..1000.

Build a Node chain and use fast/slow references to return the payload of its second middle (index floor(n/2)). Return null/None for an empty chain. Do not compute its middle through direct array indexing.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`middle_value([])` returns `None`.

`middle_value([2, 5, 9, 12])` returns `9`.

`middle_value([7])` returns `7`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

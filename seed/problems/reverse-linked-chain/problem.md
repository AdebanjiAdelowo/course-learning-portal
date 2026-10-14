## Contract and representation

Implement `reverse_linked(items)`. Each values list has at most 100 integers within -1000..1000.

Build an acyclic Node chain from the input, reverse its next references in place without replacement payload nodes, and return the serialized values of the new chain.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`reverse_linked([])` returns `[]`.

`reverse_linked([2, 5, 9])` returns `[9, 5, 2]`.

`reverse_linked([7])` returns `[7]`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

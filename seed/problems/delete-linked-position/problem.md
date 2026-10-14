## Contract and representation

Implement `delete_linked(items, index)`. Each values list has at most 100 integers within -1000..1000.

Input is nonempty and 0 <= index < len(items). Build an acyclic Node chain, bypass the indexed node and return serialized values of the remaining chain. Do not replace nodes merely to copy values around the removed position.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`delete_linked([7], 0)` returns `[]`.

`delete_linked([2, 5, 9], 1)` returns `[2, 9]`.

`delete_linked([2, 5], 0)` returns `[5]`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

## Contract and representation

Implement `detect_cycle(items, entry)`. Each values list has at most 100 integers within -1000..1000.

entry is -1 or an existing index. Empty input requires entry=-1. Build nodes in order; when entry>=0, connect the final node to that indexed node. Use identity-based fast/slow detection and return a boolean. Do not serialize a cyclic chain.

## Input/output boundary

The runner supplies JSON lists, integers and booleans; it does not supply Node objects. The provided helpers build actual nodes. Implement the algorithm on those nodes, then return the specified JSON-compatible result. Do not read standard input. Builder and serializer costs must be reported separately from pointer-kernel costs.

## Examples

`detect_cycle([], -1)` returns `False`.

`detect_cycle([7, 7, 7], -1)` returns `False`.

`detect_cycle([2, 5, 9], 1)` returns `True`.

## Self-review requirement

Visible tests check returned behavior; they cannot prove that your implementation used the required node algorithm or conserved node identities. Explain your invariant and add identity checks to your own Python tests. Passing local samples is not official grading.

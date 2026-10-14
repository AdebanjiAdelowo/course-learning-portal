## Learning objectives and prerequisites

Distinguish node identity from value equality, represent an empty list, traverse references, and explain why indexed access differs from arrays. Prerequisites: Python references and mutability, loops, and DSA Module 3's array model.

## Motivation and representation

A chain of directions can connect places that are far apart. Unlike an array index, each direction reveals only the next place. A singly linked node stores a payload and a next reference. Head points to the first node; following next eventually reaches null (`None` in Python) in an acyclic list. Nodes need not occupy contiguous addresses. A drawing's left-to-right layout is a readability choice rather than a memory guarantee.

Two nodes may both hold 7 and still be different objects. Pointer algorithms compare node identity with `is` when deciding whether two references reach the same node. They compare payload values with `==` when searching for a value. Mixing these questions breaks cycle detection and duplicate handling.

## Contract and algorithm

The representation invariant for an acyclic size-n list is that exactly n distinct nodes are reachable from head, the final node's next is None, and an optional tail points to that final node. For n=0, both head and tail must be None. A maintained size is metadata that every mutation must update; merely adding a field does not make it accurate.

```text
TRAVERSE(head)
    current = head
    while current is not null
        process current.value
        current = current.next
```

```python-run
class Node:
    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def build(values):
    head = None
    for value in reversed(values):
        head = Node(value, head)
    return head


def values(head):
    result = []
    while head is not None:
        result.append(head.value)
        head = head.next
    return result
head = build([4, 7, 4])
assert values(head) == [4, 7, 4]
assert head is not head.next.next
assert head.value == head.next.next.value
assert values(None) == []
print(values(head))
```

The conversion functions in lessons and coding practice build real Node objects from JSON lists and serialize an acyclic chain back to a JSON list. JSON indices are a transport representation; the algorithm still follows next references. Serialization is not permitted for an arbitrary cyclic chain without a stopping rule.

## Worked trace and correctness

For nodes N0(4), N1(7), N2(4), head=N0 and arrows N0→N1→N2→None. The current reference visits N0, then N1, then N2. Both 4s are visited because they are separate nodes.

Before each iteration, the output contains exactly the values on the processed prefix, and current identifies the first unprocessed node. Processing one payload and following its next extends that prefix. When current becomes None, no node remains. Termination follows because an acyclic chain has finite length and each step advances to a new node. This proof explicitly fails for a cycle; later lessons add a detector.

## Complexity and comparison

Traversal takes Θ(n) next-reference reads and Θ(n) payload visits. Finding index k takes Θ(k+1) work from head, whereas array indexing is Θ(1) slot work. Searching by value remains Θ(n) worst case in both structures. A maintained tail permits direct access to the final node but does not reveal its predecessor.

The traversal kernel uses O(1) auxiliary references. The demonstration's returned list uses Θ(n) output space. Node allocation, payload storage, object headers and reference fields add overhead beyond the payload alone. Python classes have implementation-specific object overhead; do not equate a node's logical two fields with a precise byte count. Reference chasing can also reduce locality compared with scanning contiguous array reference slots.

## Common mistakes and exercises

Do not move head while merely traversing unless destroying or consuming the list is part of the contract. Do not use a payload value as a unique identifier. A reference copied into another variable still denotes the same mutable node; changing that node is visible through both references.

Trace `[7,7]`, an empty chain and a singleton. Draw two lists sharing a suffix and explain why changing a shared node affects both views. Implement first-value search and state whether it returns a node, a position or a boolean. Explain what extra assumption is needed to prove termination.

## Summary and further study

Head gives entry to a chain of identities; values alone do not describe pointer topology. Next study how insertion and deletion change incoming links, and compare their local pointer work with the cost of locating the affected position.

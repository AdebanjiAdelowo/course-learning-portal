## Learning objectives and prerequisites

Detect cycles using identity, prove why fast and slow meet, encode cyclic inputs without cyclic JSON, and choose linked structures according to actual operation costs. Prerequisites: fast/slow traversal, modular arithmetic and reference identity.

## Problem and transport representation

An accidental next-reference cycle makes a None-terminated traversal nonterminating. The question is whether a cycle exists, not whether two nodes have equal values. In coding practice we encode a chain by values plus a cycle entry position: -1 means the last node points to None; a nonnegative position p means the last node points back to node p. The empty list permits only -1. This finite JSON representation describes topology without attempting to serialize object cycles.

For `[7,7,7]` with entry -1, there is no cycle despite repeated payloads. With entry1, the last node points to the second node and traversal repeats forever unless the algorithm detects it.

## Algorithm and executable Python

```text
HAS_CYCLE(head)
    slow = fast = head
    while fast exists and fast.next exists
        slow = slow.next
        fast = fast.next.next
        if slow is fast: return true
    return false
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
def build_cycle(items, entry):
    nodes = [Node(value) for value in items]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and entry >= 0:
        nodes[-1].next = nodes[entry]
    return nodes[0] if nodes else None


def has_cycle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

assert not has_cycle(None)
assert not has_cycle(build_cycle([7, 7, 7], -1))
assert has_cycle(build_cycle([7, 7, 7], 1))
assert has_cycle(build_cycle([4], 0))
print(has_cycle(build_cycle([1, 2, 3, 4], 1)))
```

The builder assumes the stated entry bound; a public API should validate it. Never call the earlier unbounded values serializer on a cyclic result. To inspect such a graph, use a visited-identity set or a bounded trace with an explicit stopping condition.

## Correctness, termination and complexity

For an acyclic chain, fast reaches None after a finite number of steps, so the function returns false. Checking identity after advancing avoids returning true immediately merely because both references initially equal head.

The speed invariant is that after t loop iterations, slow has advanced t links and fast has advanced 2t links, counting repeated visits too. For a cycle, let μ be the noncyclic prefix length and λ be the cycle length. Once slow enters the cycle, fast is also inside it. Relative position changes by one modulo λ per iteration because their speeds differ by one. Therefore within at most λ further iterations the two references coincide. At that point the identity test returns true. This proves termination even when the underlying traversal has no null end. Time is O(μ+λ), and auxiliary references are O(1).

A visited-identity set offers another detector: encountering an already visited node proves a cycle. That version uses O(μ+λ) auxiliary space and is often easier for debugging. The constant-space method trades that storage for the speed argument; neither should compare payload values.

## Finding the entry as further reasoning

After a meeting, reset one pointer to head and advance both one step at a time; they meet at the cycle entry. This extension depends on the meeting-distance relation modulo λ, not a guess from the drawing. It is not required by this lesson's boolean practice problem. State a separate return contract before implementing it.

## Arrays versus linked structures

| Operation | Array-style sequence | Singly linked chain |
| --- | --- | --- |
| Indexed access | Constant slot work | Linear traversal in the worst case |
| Ordered front insertion | Linear suffix movement | Constant head rewiring |
| Append | Amortized constant with geometric growth | Constant with a maintained tail, otherwise traversal |
| Delete known successor | May shift suffix | Constant if predecessor is already known |
| Search by value | Linear worst case | Linear worst case |

Doubly linked nodes permit constant local removal of a known member, but finding that member is still a search. Their extra references, object allocation and consistency maintenance have costs. Contiguous reference-slot scans may have better locality. Pick a representation from the workload rather than the slogan that linked insertion is always faster.

## Common mistakes and exercises

Compare with `is`, not payload `==`. Test a singleton self-cycle, a cycle beginning at head, a long prefix before a short cycle, and repeated values without a cycle. Explain why running a normal serializer before detection defeats the purpose. For each row in the table, identify whether location work is included. Describe an API misuse involving a foreign or detached node in a doubly linked container.

## Summary and further study

A cycle is a topology property of identities. Two traversal speeds detect it with a modular-distance proof. The linked-list laboratory combines these contracts with mutation tests and node-conservation checks. Use actual workloads and explicit preconditions when comparing this structure with arrays.

## Learning objectives and prerequisites

Reverse an acyclic singly linked chain without allocating replacement nodes, preserve the untouched suffix, prove a three-reference invariant, and repair head/tail metadata. Prerequisites: node identity and safe local rewiring.

## The danger of losing the suffix

Reversal changes each next arrow to point towards the previous node. If you overwrite current.next before saving it, the rest of the original chain may become unreachable. Three working references have distinct jobs: previous is the reversed prefix, current is the first untouched node, and saved_next temporarily preserves the successor while its incoming arrow changes.

The node identities and payloads remain unchanged. Returning a Python list with reversed values is a different operation from reversing the next references of the original Node objects. Our contract returns the new head of those same nodes.

## Algorithm and executable code

```text
REVERSE(head)
    previous = null; current = head
    while current is not null
        saved_next = current.next
        current.next = previous
        previous = current
        current = saved_next
    return previous
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
def reverse(head):
    previous = None
    current = head
    while current is not None:
        saved_next = current.next
        current.next = previous
        previous = current
        current = saved_next
    return previous

head = build([2, 5, 9])
original_nodes = [head, head.next, head.next.next]
new_head = reverse(head)
assert values(new_head) == [9, 5, 2]
assert new_head is original_nodes[2]
assert new_head.next.next is original_nodes[0]
assert original_nodes[0].next is None
assert reverse(None) is None
assert values(reverse(new_head)) == [2, 5, 9]
print(values(new_head))
```

The final print follows the alias held by new_head after the second reversal: it now denotes the last node, so it prints `[9]`, not the entire restored chain. The assertions demonstrate why a caller must keep the returned head. Reversing pointers mutates what all aliases see.

## Correctness trace and loop invariant

For N0→N1→N2→None, first save N1, change N0.next=None, set previous=N0 and current=N1. Next save N2, change N1.next=N0 and advance. Finally save None, change N2.next=N1 and finish with previous=N2.

Before each iteration, previous denotes exactly the reversed processed prefix and current denotes the untouched original suffix. These chains are disjoint and together contain all original nodes. Saving the successor allows current to leave the untouched suffix safely; linking it to previous extends the reversed prefix by one. Advancing current restores the invariant. At termination the untouched suffix is empty, so previous reaches all original nodes in reverse order.

```viz
algorithm: linked-list
input: 2, 5, 9
operation: reverse
```

Watch savedNext before each arrow changes. The diagram keeps disconnected nodes visible rather than assuming every node is currently reachable from the old head. Head and tail are committed after the loop; transient states are working algorithm states, not completed list representations.

## Termination and complexity

Each iteration transfers one node from a finite acyclic suffix to the processed prefix, so the suffix length decreases by one. There are n iterations, Θ(n) next reads and writes, and O(1) auxiliary references. No replacement nodes are required. A recursive alternative retains Θ(n) call frames and can exceed Python's recursion limit; the iterative loop avoids that limitation.

A container with a maintained tail must retain old_head before reversal and set tail=old_head afterwards, while head becomes previous. Empty input produces head=tail=None. A singleton retains the same head/tail and a null next reference.

## Mistakes and exercises

Changing current.next before saving it loses the remaining route. Updating current from its newly reversed next points backwards and revisits processed nodes. Leaving head unchanged publishes only the original first node, now the tail. Testing only payload values misses implementations that allocate replacement nodes instead of rewiring originals.

Trace an empty list and a singleton. Test both expected reverse order and preservation of the set of node identities. Explain why reversing twice is not a sufficient test by itself: doing nothing is also self-inverse. Compare a correct implementation's next-read count with its number of nodes.

## Summary and further study

Three references preserve ownership of the two moving chains. The invariant proves both value order and node conservation. Next use multiple traversal speeds for midpoint and cycle questions, where reference identity becomes especially important.

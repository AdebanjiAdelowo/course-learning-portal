## Learning objectives and prerequisites

Insert at head, tail and an indexed position; delete a known successor; repair head/tail metadata; and separate locating a predecessor from updating links. Prerequisites: node references, acyclic traversal and boundary contracts.

## Save the route before changing it

To insert X between predecessor P and successor S, first set X.next=S, then P.next=X. Updating P first and then reading P.next as the old successor loses the original route. At the head there is no predecessor, so the incoming reference is the caller's head variable. A function that may change head must return the new head or mutate a container that owns it.

Deleting a successor sets P.next=victim.next. This is constant pointer work once P is known. Finding P by numeric position requires traversal. Deleting a tail in a singly linked list is not constant-time merely because tail is known: its predecessor is not stored there.

## Indexed algorithm and executable implementation

```text
INSERT(head, index, value)
    require 0 <= index <= length
    if index = 0: return new Node(value, head)
    locate node at index-1
    new.next = predecessor.next
    predecessor.next = new
    return head
DELETE(head, index)
    require 0 <= index < length
    if index = 0: return head.next
    locate node at index-1
    predecessor.next = predecessor.next.next
    return head
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
def insert(head, index, value):
    if index < 0:
        raise IndexError('negative index')
    if index == 0:
        return Node(value, head)
    predecessor = head
    for _ in range(index - 1):
        if predecessor is None:
            raise IndexError('index outside list')
        predecessor = predecessor.next
    if predecessor is None:
        raise IndexError('index outside list')
    predecessor.next = Node(value, predecessor.next)
    return head


def delete(head, index):
    if index < 0 or head is None:
        raise IndexError('invalid deletion')
    if index == 0:
        return head.next
    predecessor = head
    for _ in range(index - 1):
        if predecessor.next is None:
            raise IndexError('index outside list')
        predecessor = predecessor.next
    if predecessor.next is None:
        raise IndexError('index outside list')
    predecessor.next = predecessor.next.next
    return head

head = insert(build([2, 5, 9]), 1, 7)
assert values(head) == [2, 7, 5, 9]
head = delete(head, 2)
assert values(head) == [2, 7, 9]
assert values(insert(None, 0, 4)) == [4]
assert delete(build([4]), 0) is None
print(values(head))
```

The implementation does not maintain a tail container. A container that does must set tail when inserting into an empty list or after the current tail, and must repair tail on deleting its node. Removing the sole node sets both head and tail to None. Insertion after a maintained tail is constant pointer work; without tail, finding the end takes linear traversal.

## Worked pointer states and visualization

Initially P.next=S. Allocate X with next=S: the original chain is still intact and X is detached. Set P.next=X: the chain becomes P→X→S. For deletion, save S=victim.next, bypass victim, then update any tail metadata and detach the victim if the API requires it. Other external aliases may still reference the detached node, so detaching is observable behavior that belongs in the contract.

```viz
algorithm: linked-list
input: 2, 5, 9
operation: insert
index: 1
value: 7
```

Try head and end insertion, deletion of the sole node, and an invalid deletion index. Every run begins with the specified initial values. Node identities stay fixed in the diagram while arrows change, making intermediate disconnected states visible. This trace runs a predefined algorithm, not student Python.

## Correctness, termination and complexity

The traversal invariant is that after t advances, the working reference denotes original node t and no link has changed. Traversal preserves the original chain and reaches the predecessor at position index-1. Inserting its new successor preserves the prefix and suffix and introduces exactly one node. Bypassing a victim preserves every other node in order. The indexed traversal is bounded by the supplied index and either finds a valid node or raises before changing existing links.

Local rewiring uses O(1) references and pointer writes. Indexed operations cost O(n) in the worst case because of location work. Head edits cost Θ(1); tail append costs Θ(1) with a maintained tail. A newly allocated node is output structure space, not a growing auxiliary traversal stack.

## Mistakes, exercises and summary

Do not overwrite an incoming reference before saving the successor. Remember to assign `head = insert(...)` or `head = delete(...)` when head can change. Validate a position before mutation so errors do not leave a half-edited structure. Test empty, singleton, head, middle, end and out-of-range cases. Explain why removing a node with a known predecessor differs from removing a node located only by payload. Next compare doubly linked nodes, which retain predecessor references at additional storage and consistency cost.

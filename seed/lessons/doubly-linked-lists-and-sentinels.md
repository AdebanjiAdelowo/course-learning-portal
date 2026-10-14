## Learning objectives and prerequisites

Maintain reciprocal next/previous links, remove a known node in constant pointer work, use sentinels to simplify boundaries, and account for the cost of locating nodes. Prerequisites: singly linked insertion/deletion and object identity.

## Two directions, two consistency obligations

A doubly linked node stores value, next and prev. When X.next=Y, the adjacent pair normally requires Y.prev=X. Head has no previous logical node and tail has no next logical node. A mutation that updates only one direction creates a broken representation even if forward traversal still looks correct.

Sentinel nodes are structural boundaries that hold no logical payload. A circular sentinel root can serve as both entry and termination marker: an empty list has root.next=root and root.prev=root. This intentional circular structure is not an accidental cycle bug. Traversal must stop at root, not None. Our next lesson's cycle detector is for None-terminated lists and would correctly regard a sentinel ring as cyclic under that different contract.

## Algorithms with a sentinel

```text
INSERT_BETWEEN(left, right, node)
    node.prev = left; node.next = right
    left.next = node; right.prev = node
REMOVE(node)
    require node is a member and is not the sentinel
    node.prev.next = node.next
    node.next.prev = node.prev
    detach node
```

```python-run
class DNode:
    def __init__(self, value=None):
        self.value = value
        self.prev = self.next = None


def sentinel():
    root = DNode()
    root.next = root.prev = root
    return root


def insert_between(left, right, node):
    node.prev, node.next = left, right
    left.next, right.prev = node, node


def remove_node(node):
    left, right = node.prev, node.next
    left.next, right.prev = right, left
    node.prev = node.next = None


def read_ring(root, backwards=False):
    result = []
    current = root.prev if backwards else root.next
    while current is not root:
        result.append(current.value)
        current = current.prev if backwards else current.next
    return result

root = sentinel()
first, second = DNode(4), DNode(9)
insert_between(root, root, first)
insert_between(first, root, second)
assert read_ring(root) == [4, 9]
assert read_ring(root, True) == [9, 4]
remove_node(first)
assert read_ring(root) == [9]
remove_node(second)
assert root.next is root and root.prev is root
print(read_ring(root))
```

These helpers assume trusted membership and adjacency: left.next is right, right.prev is left, and node is a suitable detached object for insertion. They do not validate whether an arbitrary caller's node belongs to this particular list. A production container can hide these helpers behind ownership checks. Testing arbitrary foreign nodes without that contract would not be meaningful validation of these local algorithms.

## Worked rewiring and correctness

For left L and right R, insert X by making X.prev=L and X.next=R before linking L.next=X and R.prev=X. Afterwards both adjacent pairs satisfy reciprocal links and all other pairs remain unchanged. Deleting X replaces those two pairs with L↔R and detaches X. The sentinel ensures L and R always exist, including empty and singleton boundaries.

The representation invariant at each public operation boundary is that every forward link has its corresponding backward link and traversing the ring returns to root after visiting each logical node once. Intermediate assignment states may temporarily break reciprocity; no public callback should inspect those partially updated states. The algorithms perform finitely many assignments and terminate.

## Complexity and representation trade-offs

Insertion between known adjacent nodes and removal of a known member need Θ(1) pointer work and O(1) auxiliary storage. Searching for that member by index or value remains Θ(n). With both ends available, index lookup can start at the nearer end, costing Θ(min(k,n-1-k)+1), still Θ(n) for middle positions.

The extra prev reference and sentinel have storage overhead. Each mutation has more links to maintain than in a singly linked structure. Arrays may provide better locality and indexed access; doubly linked nodes suit repeated local edits when callers already hold valid node references. They are not universally superior.

## Mistakes, exercises and summary

Never remove the sentinel with a helper intended for payload nodes. Never treat `node is root` as payload equality. Test both traversal directions after every mutation; a correct forward list does not prove correct prev links. Detaching a node must prevent accidental reuse as if it were still attached. Draw insertion and deletion of a sole node, then verify root's two links return to itself. Compare the number of pointer writes with the singly linked case. The key benefit is access to the predecessor once a node is known, balanced against added fields and consistency obligations.

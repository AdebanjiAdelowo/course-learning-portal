## Approach and correctness

The output prefix is sorted and contains exactly the consumed nodes; both remaining heads bound all following values. Selecting the smaller head extends the invariant, and each step consumes one node. Kernel O(n+m) time and O(1) references plus a dummy; conversion/output O(n+m) space.

## Reference implementation

```python
class Node:
    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def build(items):
    head = None
    for value in reversed(items):
        head = Node(value, head)
    return head


def serialize(head):
    answer = []
    while head is not None:
        answer.append(head.value)
        head = head.next
    return answer


def merge_linked(left_items, right_items):
    left, right = build(left_items), build(right_items)
    dummy = tail = Node(None)
    while left is not None and right is not None:
        if left.value <= right.value:
            tail.next = left
            left = left.next
        else:
            tail.next = right
            right = right.next
        tail = tail.next
    tail.next = left if left is not None else right
    return serialize(dummy.next)
```

## Boundaries and review

Test empty inputs where allowed, singletons, duplicates, head/end operations and both length parities. For cycles include a self-cycle and repeated values without a cycle. Explain why a payload comparison cannot substitute for node identity, and why plain serialization requires an acyclic chain. These samples do not enforce algorithm choice.

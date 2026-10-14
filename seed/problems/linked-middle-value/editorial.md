## Approach and correctness

After t iterations, slow advances t and fast advances 2t links. The guard stops after floor(n/2) iterations for either parity. Kernel Theta(n) time and O(1) references; input-to-node conversion uses Theta(n) space.

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


def middle_value(items):
    slow = fast = build(items)
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return None if slow is None else slow.value
```

## Boundaries and review

Test empty inputs where allowed, singletons, duplicates, head/end operations and both length parities. For cycles include a self-cycle and repeated values without a cycle. Explain why a payload comparison cannot substitute for node identity, and why plain serialization requires an acyclic chain. These samples do not enforce algorithm choice.

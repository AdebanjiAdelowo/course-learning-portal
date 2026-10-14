## Approach and correctness

Bypassing the victim connects its predecessor to its successor, preserving every other node in order. Head deletion publishes its successor. Local rewiring O(1), locating O(index), with Theta(n) total conversion/output work and space.

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


def delete_linked(items, index):
    head = build(items)
    if index == 0:
        return serialize(head.next)
    predecessor = head
    for _ in range(index - 1):
        predecessor = predecessor.next
    predecessor.next = predecessor.next.next
    return serialize(head)
```

## Boundaries and review

Test empty inputs where allowed, singletons, duplicates, head/end operations and both length parities. For cycles include a self-cycle and repeated values without a cycle. Explain why a payload comparison cannot substitute for node identity, and why plain serialization requires an acyclic chain. These samples do not enforce algorithm choice.

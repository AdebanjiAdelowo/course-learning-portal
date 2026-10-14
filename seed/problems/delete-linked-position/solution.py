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

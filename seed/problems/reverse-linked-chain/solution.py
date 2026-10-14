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


def reverse_linked(items):
    head = build(items)
    previous = None
    current = head
    while current is not None:
        saved_next = current.next
        current.next = previous
        previous = current
        current = saved_next
    return serialize(previous)

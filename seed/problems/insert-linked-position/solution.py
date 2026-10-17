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


def insert_linked(items, index, value):
    head = build(items)
    if index == 0:
        return serialize(Node(value, head))
    predecessor = head
    for _ in range(index - 1):
        predecessor = predecessor.next
    predecessor.next = Node(value, predecessor.next)
    return serialize(head)

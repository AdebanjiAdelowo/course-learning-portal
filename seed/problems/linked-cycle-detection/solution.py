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


def detect_cycle(items, entry):
    nodes = [Node(value) for value in items]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and entry >= 0:
        nodes[-1].next = nodes[entry]
    slow = fast = nodes[0] if nodes else None
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

## Learning objectives and prerequisites

Choose an explicit middle convention, derive the fast/slow invariant, handle odd and even lengths, and merge sorted chains without allocating replacement payload nodes. Prerequisites: acyclic traversal, node identity, comparisons and pointer mutation.

## What does middle mean?

For odd length 5, index2 is the unique middle. For even length4, indices1 and2 are both central. Our contract chooses the second middle, index floor(n/2), and returns None for an empty list. A different loop condition may intentionally select the first middle; do not declare one correct without stating the contract.

Fast advances two links per loop while slow advances one. When fast reaches or passes the end, slow has progressed halfway. This method uses constant working references and does not need a maintained length field.

## Algorithm and Python

```text
MIDDLE(head)
    slow = fast = head
    while fast exists and fast.next exists
        slow = slow.next
        fast = fast.next.next
    return slow
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
def middle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow

assert middle(None) is None
assert middle(build([4])).value == 4
assert middle(build([2, 5, 9, 12])).value == 9
assert middle(build([2, 5, 9, 12, 15])).value == 9
print(middle(build([2, 5, 9, 12])).value)
```

## Correctness, trace and boundaries

After t iterations, slow is at index t and fast has advanced 2t links when a node exists there. The guard prevents dereferencing a missing fast node or its missing successor. For length2m, the loop performs m iterations and slow reaches indexm. For length2m+1, it performs m iterations and slow again reaches indexm. Thus it chooses floor(n/2) in both cases.

On `[2,5,9,12]`, initial slow/fast are both index0; after one step they are1 and2; after two steps slow is2 and fast is None. The returned node contains9. On a cyclic list, the end guard may never become false; this middle function requires an acyclic input.

## Merging sorted linked chains

With two disjoint sorted acyclic lists, repeatedly take the smaller head node and append that existing node to an output chain. A dummy node simplifies initial output handling and is not part of the returned list. Select the left node on equal values for a stable merge across the two inputs.

```python

def merge(left, right):
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
    return dummy.next

assert values(merge(build([1, 4, 4]), build([2, 4, 7]))) == [1, 2, 4, 4, 4, 7]
assert values(merge(None, build([3]))) == [3]
```

Before each selection, the completed output prefix is sorted, contains precisely the already consumed input nodes, and precedes every unconsumed value. Taking the smaller head extends it correctly. At least one input advances each iteration, so the sum of remaining lengths decreases. The remaining suffix is already sorted and can be attached directly. Disjointness is essential: shared suffix nodes require a different contract or identity handling to avoid linking a node to itself.

## Complexity and common mistakes

Middle finding takes Θ(n) time and O(1) auxiliary references. Merging n+m nodes takes O(n+m) comparisons and O(1) auxiliary references plus one dummy node. Serializing the merged result to JSON adds Θ(n+m) output storage. Repeatedly finding the tail while building the output would make construction unnecessarily expensive; keep the tail reference.

Guard fast before inspecting fast.next. State the even-length convention in tests. Do not use this midpoint loop as a cycle-safe traversal. Do not claim merge preserves the original next topology: it reuses nodes and mutates links. Test duplicate payloads, empty inputs and skewed input lengths.

## Exercises and summary

Trace lengths 0 through6 and record the returned middle index. Adapt the method to choose the first middle of even lengths and explain the altered guard. Prove stable merge's equality rule refers to node order, not just identical payload values. Next analyze why two different traversal speeds meet when a cycle prevents fast from reaching None.

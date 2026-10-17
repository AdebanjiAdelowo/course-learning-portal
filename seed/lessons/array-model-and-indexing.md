## Learning objectives

Distinguish an array interface from its representation, calculate an element address, check index bounds, and separate indexing from searching. Prerequisites: Python lists, functions and the unit-cost model from DSA Module 1.

## Motivation and abstract operations

A row of numbered lockers gives direct access when you know a locker number. Finding the locker containing a particular object still requires a search unless you have additional information. Arrays have the same distinction: an index identifies a location, whereas a value does not identify its location.

An abstract sequence contains $n$ values indexed from $0$ through $n-1$. Its operations include reading or replacing an indexed value and traversing values in order. The abstraction does not require a particular machine layout. A static array representation reserves a fixed block of slots; a dynamic array permits the logical sequence to grow by managing a separate backing block.

## Contiguous storage and a cost model

If the first slot has address $b$ and each slot occupies $w$ bytes, slot $i$ begins at $b+iw$. Computing this address needs a constant number of arithmetic operations in a machine-word model. The slots must have fixed width for this argument. The objects referenced by those slots need not themselves be adjacent or equally sized.

A Python list is a sequence of object references in its usual CPython implementation. Reading a slot retrieves a reference; it does not copy the whole referenced object. Lists can therefore contain integers, strings and other lists. This lesson's model counts slot operations, rather than the cost of constructing arbitrary objects or manipulating unbounded integers. Representation details are implementation dependent.

## Algorithm and Python

```text
READ(A, i)
    require 0 <= i < size(A)
    return the value in slot i
FIND(A, x)
    for each logical index i in increasing order
        if A[i] = x: return i
    return -1
```

```python-run
def first_index(items, target):
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1

items = [14, 6, 14, -3]
assert items[2] == 14
assert first_index(items, 14) == 0
assert first_index(items, 8) == -1
assert first_index([], 8) == -1
print('Index 2:', items[2], 'first 14:', first_index(items, 14))
```

## Worked address and search examples

For $b=1000$ and $w=8$, index 3 begins at address 1024. This is a diagrammatic address, not a Python object's memory address. In `[14,6,14,-3]`, searching for -3 compares four values, while reading index 3 accesses one slot. Searching for 14 returns index zero because traversal stops at the first match.

Python also supports negative indices: `items[-1]` denotes the last logical element when the list is nonempty. Our algorithm contracts generally use nonnegative indices to make boundary proofs explicit. A negative-index convenience does not make an absent value searchable in constant time.

## Correctness and termination

Before iteration $i$, no earlier index contains the target: otherwise the algorithm would already have returned. If the current value matches, all earlier values have been excluded, so $i$ is the first index. If traversal finishes, every logical index has been checked and returning -1 is correct. The loop has exactly $n$ possible iterations and therefore terminates.

## Complexity

Indexed reading and replacement take $\Theta(1)$ slot operations. First-match search takes $\Theta(n)$ comparisons in the worst case, $\Theta(1)$ when the first element matches, and $O(1)$ auxiliary space. Traversal has $\Theta(n)$ work even when backing capacity exceeds $n$. Equality on complex objects may itself be expensive; multiply the comparison cost into the analysis when necessary.

## Common mistakes and boundaries

Do not conflate an array index with a stored value. Index $n$ is outside a size-$n$ array; a valid insertion boundary is not necessarily a valid reading boundary. Empty arrays have no readable index. Replacing an element preserves size, while inserting an element changes size and may move other values. Slicing makes a new shallow sequence rather than providing this constant-time index operation.

## Practice and knowledge checks

1. Compute addresses for indices 0, 2 and 5 when $b=256,w=4$. Explain why the same formula cannot locate variable-width records without an offset table.
2. Trace an absent-target search on five elements and count comparisons.
3. Why can a list of lists have contiguous reference slots while its nested objects are elsewhere?
4. Design tests for first-match behavior with duplicates, singleton and empty inputs.

Answers: addresses 256,264,276; absent search uses five comparisons. Slots store references rather than inline nested lists. A duplicate test must expect the earliest index, not merely any matching one.

## Summary and further study

Array indexing follows a location calculation; searching follows a value comparison process. Our proofs concern logical elements, not unused backing slots. Next study insertion and deletion, where order preservation requires movement. Revisit DSA Module 1's linear-search invariant if the loop proof feels unfamiliar.

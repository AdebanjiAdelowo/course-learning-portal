## Learning objectives and prerequisites

Implement insertion and deletion without losing values, prove shift direction is correct, and count work as a function of the affected suffix. You need indexed access, Python loops and loop invariants. This lesson separates ordered deletion from the cheaper unordered alternative.

## Why shifting is necessary

An ordered sequence promises that unaffected elements retain their relative order. Inserting $x$ at boundary $k$ changes `[a,b,c,d]` into `[a,b,x,c,d]` for $k=2$. The suffix cannot remain at its original indices. Conversely deleting index 1 produces `[a,c,d]`, requiring the following values to move left.

Reading index $k$ is direct, but locating a value to delete requires a separate search. Quote both costs when an operation is described by value rather than index. A known index does not eliminate the ordered shift.

## Algorithm design

```text
INSERT(A, k, x)
    require 0 <= k <= n
    reserve one final slot
    for i = n down to k+1
        A[i] = A[i-1]
    A[k] = x
DELETE(A, k)
    require 0 <= k < n
    for i = k to n-2
        A[i] = A[i+1]
    discard the last logical slot
```

Insertion moves right to left. If it moved left to right, overwriting the next source slot would duplicate values. Deletion moves left to right for the symmetric reason: each source is read before it is overwritten.

## Executable implementation

```python-run
def insert_at(items, index, value):
    if not 0 <= index <= len(items):
        raise IndexError('invalid insertion boundary')
    items.append(None)
    for i in range(len(items) - 1, index, -1):
        items[i] = items[i - 1]
    items[index] = value
    return items

def delete_at(items, index):
    if not 0 <= index < len(items):
        raise IndexError('invalid deletion index')
    removed = items[index]
    for i in range(index, len(items) - 1):
        items[i] = items[i + 1]
    items.pop()
    return removed

values = [2, 5, 9]
assert insert_at(values, 1, 7) == [2, 7, 5, 9]
assert delete_at(values, 2) == 5
assert values == [2, 7, 9]
assert insert_at([], 0, 4) == [4]
print(values)
```

The append in this demonstration reserves space through Python's list implementation. It can resize the backing allocation. The next lesson exposes that additional work explicitly; this lesson focuses on the suffix shifts.

## Worked trace and correctness

To insert 7 at index 1 of `[2,5,9]`, first reserve a final slot. Move 9 from index2 to3, move5 from1 to2, then write7 at1. Two shifts plus the final write preserve all original elements.

For insertion, after processing destination $i$, the already processed suffix equals the corresponding original suffix shifted by one. Unprocessed source indices lie below $i$ and remain intact. When the loop stops, the whole original suffix starting at $k$ has moved right; writing $x$ completes the desired sequence. The prefix below $k$ never changes. For deletion, after each leftward copy, the processed region equals the original sequence with the removed position skipped. The final logical slot is a duplicate and can be discarded.

Both loops have bounded integer ranges and terminate. Validate boundaries before mutation so an invalid request leaves the list unchanged.

## Complexity and alternative semantics

Insertion shifts $n-k$ values and performs one final write, plus any capacity expansion. Deletion shifts $n-k-1$ values and clears or discards a final slot. Worst-case ordered insertion and deletion are $\Theta(n)$; deleting the last element requires no shifts. Auxiliary space is $O(1)$ for shifting, but a backing-array resize can temporarily use $\Theta(n)$ additional slots.

If order is irrelevant, deletion can replace the removed element with the last element and pop the end in constant slot work. That changes the interface's semantics. It is incorrect for a sorted sequence or any application relying on order. Python list insertion near the front is not an amortized constant-time operation.

## Common mistakes

Moving an insertion suffix forward overwrites unread values. Forgetting to reserve a slot makes the first destination invalid. Returning the last value after shifting loses the removed value; save it first. Mutating a list while iterating over its original indices can skip elements or invalidate assumptions. Separate batch transformations from repeated deletion when possible.

## Exercises and knowledge checks

Trace insertion at index0 and index $n$. For size6, how many shifts does deletion at index2 perform? Answer: three. Explain why an empty list permits insertion at zero but not deletion at zero. Write tests showing invalid boundaries do not mutate input. Compare repeated front deletion with a single linear filtering pass: the former can accumulate quadratic work.

## Summary and further study

Shift direction protects unread source values. Costs depend on the affected suffix as well as capacity growth. Practice the array-edit simulation problem, then study logical size versus capacity and observe the same shifts in the dynamic-array visualizer.

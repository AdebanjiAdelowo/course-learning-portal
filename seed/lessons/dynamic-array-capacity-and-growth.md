## Learning objectives and prerequisites

Distinguish size from capacity, implement a geometric-growth model, count copies during resizing, and understand why an individual append may be expensive. Prerequisites: array indexing and ordered shifts. This is a teaching model, not a claim about CPython's exact allocation formula.

## Representation invariant

Logical size $n$ counts values in the sequence. Capacity $c$ counts backing slots. Maintain $0\le n\le c$. Values occupy indices below $n$; unused slots at or above $n$ are not logical elements, even if they contain an old bit pattern or a sentinel. Our model clears spare slots to `None` solely to make diagrams readable.

A static array has fixed capacity. A dynamic array exposes a growing sequence while replacing its backing block when necessary. Clients should not rely on the backing address remaining stable after growth. Python list operations hide this allocation mechanism.

## Model and algorithm

Start with capacity one. When append finds $n=c$, allocate a block with $2c$ slots, copy $n$ references in order, then replace the backing block. Write the new value at index $n$ and increase size. When there is spare capacity, append only writes one slot. This model does not shrink automatically.

```text
APPEND(x)
    if size = capacity
        allocate new buffer with 2 * capacity slots
        copy all size logical values
        replace buffer and capacity
    buffer[size] = x
    size = size + 1
```

```python-run
class DoublingArray:
    def __init__(self):
        self.buffer = [None]
        self.size = 0
        self.copies = 0

    def append(self, value):
        if self.size == len(self.buffer):
            bigger = [None] * (2 * len(self.buffer))
            for i in range(self.size):
                bigger[i] = self.buffer[i]
                self.copies += 1
            self.buffer = bigger
        self.buffer[self.size] = value
        self.size += 1

    def values(self):
        return self.buffer[:self.size]

model = DoublingArray()
for x in [4, 8, 15, 16, 23]:
    model.append(x)
assert model.values() == [4, 8, 15, 16, 23]
assert model.size == 5 and len(model.buffer) == 8
assert model.copies == 1 + 2 + 4
print('size', model.size, 'capacity', len(model.buffer), 'copies', model.copies)
```

Allocating and initializing the Python teaching buffer also takes time. The displayed copy count measures reference copies, not elapsed time or every allocation operation. Proportional allocation work preserves the asymptotic result in the next lesson.

## Worked sequence and interactive trace

Appending five values changes capacities 1,2,4,4,8. The resize-copy counts are0,1,2,0,4. After the fifth append, three slots are spare capacity. The fifth append alone costs four copies and one value write in the simplified model.

```viz
algorithm: dynamic-array
input: 4, 8, 15, 16
operation: append
value: 23
```

Try an insertion at index1. Growth copies four original elements, then insertion shifts the suffix right. Try deletion and traversal separately. Each run starts from the supplied initial list, rather than silently accumulating mutations from a previous run. The smallest power-of-two capacity holding that initial list is chosen. Allocation creates an empty destination buffer; the trace shows copies arriving one at a time while the source is retained.

## Correctness and termination

Before copying index $i$, the new buffer's prefix through $i-1$ equals the original logical prefix. Copying the next source preserves this invariant. After $n$ copies, the new buffer represents the same sequence. The new capacity is at least $n+1$, so the final append write is valid. Increasing size makes that value the final logical element. Every copy loop is finite; allocation failure would interrupt the operation rather than produce a valid completed append.

## Complexity and Python interpretation

A non-resizing append has $\Theta(1)$ slot work. A resizing append has $\Theta(n)$ slot work and needs a new $\Theta(n)$ buffer while the old one remains available for copying. Indexed reads stay constant-time. Geometric growth permits amortized constant-time append over a sequence, which does not mean a worst-case latency guarantee for one append.

Python lists overallocate in an implementation-specific manner rather than following this exact doubling model. Lists contain references, so repeated references to an object do not deep-copy that object during resizing. Allocator behavior and object lifetime details are outside our model. A list's logical `len` does not expose backing capacity.

## Common mistakes, exercises and summary

Do not read spare capacity as logical data. Do not set size equal to capacity after growing. Do not assume an append never reallocates, or that in-place insertion avoids a resize. Predict size, capacity and copy counts after nine appends: size9, capacity16, copies15. Explain why `values()` above costs $\Theta(n)$ rather than $O(1)$. Next prove the aggregate cost bound and compare geometric growth with incrementing capacity by one.

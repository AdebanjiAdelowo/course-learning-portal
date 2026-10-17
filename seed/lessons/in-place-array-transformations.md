## Learning objectives and prerequisites

Use read and write boundaries for stable compaction, reverse a sequence in place, prove safety when destinations overlap sources, and distinguish auxiliary space from output space. Prerequisites: loops, indexed writes and invariants. These patterns prepare for the dedicated Two Pointers module without replacing its later coverage.

## In-place means a space contract

A transformation is in place when it uses bounded auxiliary storage while mutating its input representation. The exact contract matters: are we required to shorten a Python list, or only return the length of a valid prefix? Is order preserved? Can invalid suffix values remain? Returning a brand-new filtered list has a different space requirement, even if Python makes that code concise.

Here stable compaction keeps every nonzero value in original order and returns the count kept. Only that prefix is defined after the operation; the remaining suffix may contain old values. A caller may choose to truncate it later. This avoids conflating the algorithm's valid prefix with list length.

## Read/write algorithm

```text
COMPACT(A)
    write = 0
    for read = 0 to n-1
        if A[read] is not zero
            A[write] = A[read]
            write = write + 1
    return write
```

The crucial relation is $write\le read$. We never overwrite a value that the next iteration still needs to inspect. The write boundary counts kept values, not the current reading index.

```python-run
def compact_nonzero(items):
    write = 0
    for read in range(len(items)):
        if items[read] != 0:
            items[write] = items[read]
            write += 1
    return write

values = [0, 4, 0, -2, 4, 0]
kept = compact_nonzero(values)
assert kept == 3 and values[:kept] == [4, -2, 4]
assert compact_nonzero([]) == 0
assert compact_nonzero([0, 0]) == 0
print('valid prefix:', values[:kept])
```

## Worked trace and correctness

On `[0,4,0,-2,4,0]`, read advances through all six indices. Write remains0 on the first zero, stores4 at0, stores-2 at1, and stores4 at2. Before reading position $r$, the prefix $A[0:write]$ equals exactly the retained values from the original prefix $A[0:r]$, in order. Skipping a zero preserves it; copying a retained value extends it correctly. Since $write\le r$, unread values remain intact. At termination this invariant proves the returned prefix is the desired stable subsequence.

The proof must refer to the original input when explaining overwritten positions. It does not claim the whole mutated list is already filtered. The fixed read range guarantees termination.

## Reversal through symmetric swaps

```python

def reverse_in_place(items):
    left, right = 0, len(items) - 1
    while left < right:
        items[left], items[right] = items[right], items[left]
        left += 1
        right -= 1
    return items

assert reverse_in_place([1, 2, 3, 4]) == [4, 3, 2, 1]
assert reverse_in_place([1, 2, 3]) == [3, 2, 1]
assert reverse_in_place([]) == []
```

Before each swap, the regions outside $[left,right]$ already match the final reversed sequence. The swap places the two boundary elements at their final destinations and shrinks the unsettled interval by two. When the pointers meet or cross, no unsettled pair remains. An odd-length middle element is already at its final index.

## Complexity and output accounting

Compaction reads $n$ elements and writes at most $n$ elements, so work is $\Theta(n)$ and auxiliary storage $O(1)$. Reversal performs $\lfloor n/2\rfloor$ swaps with $O(1)$ auxiliary storage. Slicing the resulting valid prefix to return a new list introduces $\Theta(k)$ output allocation. Report that separately from the compaction kernel's constant auxiliary storage.

Python tuple assignment uses a bounded number of references here; it does not construct a copy of the entire input. By contrast `items[::-1]` creates a new list. An in-place algorithm may still have a caller that allocates a copy to avoid mutating someone else's data.

## Common mistakes and edge cases

Repeated `pop` during forward iteration can skip elements and take quadratic shift work. Incrementing write when skipping a zero creates holes. Clearing the suffix during compaction is unnecessary for a valid-prefix contract and can introduce extra behavior. Comparing values with identity (`is`) is incorrect for numerical equality; use `!= 0` under the integer problem contract.

Empty, all-kept, all-removed, singleton and duplicate inputs exercise different boundaries. Stable compaction differs from replacing removals with the final value: that faster unordered deletion does not preserve original order.

## Exercises, checks and summary

Trace write/read on `[3,0,3,0,2]`. The valid prefix is `[3,3,2]` and returned length3. Adapt compaction to keep values at least a supplied threshold. Explain why the destination cannot get ahead of the source. Test reversal twice: every valid input should recover its original order. A self-inverse check is useful but insufficient alone, since doing nothing also passes it; combine it with specific expected outputs.

Practice stable-compaction and reverse-segment problems. The next Two Pointers module expands this boundary reasoning into searching sorted arrays and removing duplicates. Preserve the explicit contracts and cost model when carrying these patterns forward.

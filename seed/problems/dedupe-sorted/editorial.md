## Approach and correctness

Keep a write index `write` and a read index `read` that moves through the list once. Invariant: before reading position `read`, the prefix `values[0:write]` holds each distinct value of the original `values[0:read]` exactly once, in order. In sorted input all copies of a value are adjacent, so `values[read]` is new exactly when it differs from the last kept value `values[write - 1]`. Copying it to `values[write]` extends the prefix correctly. Because `write <= read`, the copy never overwrites a value that has not been read yet.

## Complexity

One read per position and at most one write per distinct value: Theta(n) time and O(1) auxiliary space in the loop, plus Theta(k) to return the prefix.

## Boundaries

An empty list returns `[]` before reading `values[0]`. A list of identical values keeps one copy. If the input were unsorted, comparing only with the last kept value would miss non-adjacent duplicates, so the precondition is essential.

## Reference implementation

```python
def dedupe_sorted(values):
    if not values:
        return []
    write = 1
    for read in range(1, len(values)):
        if values[read] != values[write - 1]:
            values[write] = values[read]
            write += 1
    return values[:write]

assert dedupe_sorted([1, 1, 2, 3, 3]) == [1, 2, 3]
assert dedupe_sorted([]) == []
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

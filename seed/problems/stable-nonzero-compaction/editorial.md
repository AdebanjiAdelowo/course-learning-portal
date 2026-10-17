## Approach and correctness

Before each read, the written prefix is the stable nonzero subsequence of the original processed input. Because write never exceeds read, future source values are intact. Theta(n) time, O(1) kernel auxiliary space, and Theta(k) returned output allocation.

## Boundaries

Check empty inputs, singleton inputs, duplicates, negative values and empty/full intervals where permitted. Index n can be a boundary but is not a readable element.

## Reference implementation

```python
def stable_nonzero(items):
    write = 0
    for read in range(len(items)):
        if items[read] != 0:
            items[write] = items[read]
            write += 1
    return items[:write]
```

## Self-review

Explain why each source is read before overwrite and why every loop terminates. Browser results are local feedback, not official grading.

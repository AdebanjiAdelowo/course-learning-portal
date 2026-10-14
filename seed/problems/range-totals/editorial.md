## Approach and correctness

The prefix invariant proves prefix[k] equals sum(items[:k]). Subtracting the unwanted left prefix proves each query. Preprocessing plus q queries takes Theta(n+q) time, Theta(n) auxiliary space and Theta(q) output space.

## Boundaries

Check empty inputs, singleton inputs, duplicates, negative values and empty/full intervals where permitted. Index n can be a boundary but is not a readable element.

## Reference implementation

```python
def range_totals(items, queries):
    prefix = [0]
    for value in items:
        prefix.append(prefix[-1] + value)
    return [prefix[right] - prefix[left] for left, right in queries]
```

## Self-review

Explain why each source is read before overwrite and why every loop terminates. Browser results are local feedback, not official grading.

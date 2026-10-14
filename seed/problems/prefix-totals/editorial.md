## Approach and correctness

The first k+1 outputs represent the empty prefix through the first k values. Adding the next value extends the invariant. Every input is visited once; time and output space are Theta(n).

## Boundaries

Check empty inputs, singleton inputs, duplicates, negative values and empty/full intervals where permitted. Index n can be a boundary but is not a readable element.

## Reference implementation

```python
def prefix_totals(items):
    answer = [0]
    for value in items:
        answer.append(answer[-1] + value)
    return answer
```

## Self-review

Explain why each source is read before overwrite and why every loop terminates. Browser results are local feedback, not official grading.

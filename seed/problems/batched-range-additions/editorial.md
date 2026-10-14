## Approach and correctness

Each update contributes value exactly between its two boundary markers. Prefix accumulation reconstructs the sum of all update contributions. Empty intervals cancel immediately. Theta(n+u) time and Theta(n) auxiliary/output space.

## Boundaries

Check empty inputs, singleton inputs, duplicates, negative values and empty/full intervals where permitted. Index n can be a boundary but is not a readable element.

## Reference implementation

```python
def apply_updates(length, updates):
    difference = [0] * (length + 1)
    for left, right, value in updates:
        difference[left] += value
        difference[right] -= value
    answer = []
    running = 0
    for i in range(length):
        running += difference[i]
        answer.append(running)
    return answer
```

## Self-review

Explain why each source is read before overwrite and why every loop terminates. Browser results are local feedback, not official grading.

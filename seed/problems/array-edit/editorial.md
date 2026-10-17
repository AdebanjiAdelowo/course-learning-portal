## Approach and correctness

Right-to-left insertion shifts preserve unread sources; left-to-right deletion shifts close the gap without overwriting future sources. Prefix and suffix invariants preserve order. Copying the input costs Theta(n) time and space even for an end edit; shifts add O(n).

## Boundaries

Check empty inputs, singleton inputs, duplicates, negative values and empty/full intervals where permitted. Index n can be a boundary but is not a readable element.

## Reference implementation

```python
def array_edit(items, operation, index, value):
    answer = list(items)
    if operation == 'insert':
        answer.append(None)
        for i in range(len(answer) - 1, index, -1):
            answer[i] = answer[i - 1]
        answer[index] = value
    else:
        for i in range(index, len(answer) - 1):
            answer[i] = answer[i + 1]
        answer.pop()
    return answer
```

## Self-review

Explain why each source is read before overwrite and why every loop terminates. Browser results are local feedback, not official grading.

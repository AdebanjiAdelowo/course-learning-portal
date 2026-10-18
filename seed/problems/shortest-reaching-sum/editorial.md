## Approach and correctness

Expand the window by one value at a time. As soon as its sum reaches the target, the window is valid; record its length and shrink from the left while it stays valid. Correctness rests on monotonicity, which needs nonnegative values. Adding a value never decreases a window's sum, and removing one never increases it. So if `[left, right]` is valid, no window that starts at `left` and ends after `right` can be shorter, which means we can stop extending from `left` and advance it. And if removing `values[left]` makes the window invalid, any window starting further left and ending at `right` was already considered. With a negative value, removing an element can increase the sum, and a window that ends later could be both shorter and valid, so the argument fails. This problem guarantees positive values.

## Complexity

`right` advances `n` times and `left` advances at most `n` times over the whole run, because each position leaves the window at most once. Total work is Theta(n) even though the inner loop sometimes runs several times: an amortised bound. Auxiliary space is O(1).

## Boundaries

An empty list returns 0. A single value that already reaches the target returns 1. If the whole list does not reach the target, the inner loop never runs and the answer is 0. Use `>=`, not `>`, for "at least".

## Reference implementation

```python
def shortest_reaching_sum(values, target):
    best = 0
    window = 0
    left = 0
    for right, value in enumerate(values):
        window += value
        while window >= target:
            length = right - left + 1
            if best == 0 or length < best:
                best = length
            window -= values[left]
            left += 1
    return best

assert shortest_reaching_sum([2, 3, 1, 2, 4, 3], 7) == 2
assert shortest_reaching_sum([1, 1, 1], 5) == 0
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

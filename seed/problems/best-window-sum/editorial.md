## Approach and correctness

The first window sums `values[0:k]`. Moving the window one place right adds the entering value `values[right]` and removes the leaving value `values[right - k]`, so the running sum always equals the sum of the current `k` values. Every window of length `k` is visited exactly once, and `best` keeps the maximum seen. No decision depends on the sign of the values: the window's length is fixed, so there is no choice about when to shrink, and negative values cause no difficulty.

## Complexity

The first window costs `k` additions and each later window costs one addition and one subtraction: Theta(n) time in total and O(1) auxiliary space. Recomputing each window from scratch would cost Theta(nk).

## Boundaries

When `k == len(values)` there is exactly one window. When `k == 1` the answer is the maximum value. Initialise `best` with the first window, not with 0, or an all-negative list returns a wrong answer.

## Reference implementation

```python
def best_window_sum(values, k):
    window = sum(values[:k])
    best = window
    for right in range(k, len(values)):
        window += values[right] - values[right - k]
        best = max(best, window)
    return best

assert best_window_sum([2, 1, 5, 1, 3, 2], 3) == 9
assert best_window_sum([-4, -2, -7], 2) == -6
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

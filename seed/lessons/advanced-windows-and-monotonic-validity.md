## Learning objectives

Define monotone validity precisely and check it before choosing a window, count valid windows instead of finding one, count windows with exactly `k` distinct values by subtracting two "at most" counts, state why some counting problems need strictly positive values, and maintain window maxima with a monotonic queue. Prerequisites: variable windows and frequency maps.

## Monotone validity, precisely

Call a property of windows **closed under shrinking** if every sub-window of a valid window is valid, and **closed under growing** if every window containing a valid window is valid. "Sum at most a bound, with nonnegative values" and "at most `k` distinct values" are closed under shrinking. "Sum at least a target, with nonnegative values" and "covers a pattern" are closed under growing.

These closure properties are exactly what the window patterns need. For a property closed under shrinking, define $L(r)$ as the smallest `left` for which `[left, r]` is valid. Then $L(r)$ never decreases as $r$ increases: if `[left, r + 1]` is valid, so is its sub-window `[left, r]`, so $L(r) \le L(r + 1)$. That is why the left boundary never needs to move backwards.

## Counting windows

For a property closed under shrinking, once the window `[left, right]` is valid and `left` is as small as possible, **every** window `[i, right]` with `left <= i <= right` is valid, and no other window ending at `right` is. So exactly `right - left + 1` valid windows end at `right`, and adding these up counts all valid windows in linear time.

"Exactly `k` distinct values" is not closed under shrinking: removing a value can drop the count to `k - 1`. But it is a difference of two properties that are: windows with exactly `k` distinct values are those with at most `k`, minus those with at most `k - 1`.

```python-run
def count_at_most_k_distinct(values, k):
    if k < 0:
        return 0
    counts, left, total = {}, 0, 0
    for right, v in enumerate(values):
        counts[v] = counts.get(v, 0) + 1
        while len(counts) > k:
            out = values[left]
            counts[out] -= 1
            if counts[out] == 0:
                del counts[out]
            left += 1
        total += right - left + 1            # every valid window ending at right
    return total

def count_exactly_k_distinct(values, k):
    return count_at_most_k_distinct(values, k) - count_at_most_k_distinct(values, k - 1)

def count_exactly_brute(values, k):
    n = len(values)
    return sum(1 for i in range(n) for j in range(i + 1, n + 1) if len(set(values[i:j])) == k)

for values in ([1, 2, 1, 2, 3], [1, 2, 1, 3, 4], [5, 5, 5], []):
    for k in range(0, 5):
        assert count_exactly_k_distinct(values, k) == count_exactly_brute(values, k)
assert count_exactly_k_distinct([1, 2, 1, 2, 3], 2) == 7
print(count_exactly_k_distinct([1, 2, 1, 2, 3], 2))
```

## When strictly positive values are needed

Count the windows whose product is less than a bound. With **positive integers**, every value is at least 1, so extending a window multiplies its product by at least 1: the property "product less than the bound" is then closed under shrinking, and removing a value from the left divides the product exactly. Zeros break this: a zero makes every window containing it valid, and dividing the running product by a leaving zero is impossible. Negative values break it too, because multiplying by a negative number flips the order. Positive fractions break it as well: removing 0.5 from a window doubles its product, so a sub-window of a valid window can be invalid. So this count needs integers that are **strictly positive**, while the sum-based windows of the previous lesson only needed nonnegative values.

```python-run
def count_product_below(values, bound):
    """values must be positive integers."""
    assert all(v > 0 for v in values)
    if bound <= 1:
        return 0
    product, left, total = 1, 0, 0
    for right, v in enumerate(values):
        product *= v
        while product >= bound:
            product //= values[left]          # exact: product is a multiple of values[left]
            left += 1
        total += right - left + 1
    return total

def count_product_brute(values, bound):
    total = 0
    for i in range(len(values)):
        p = 1
        for j in range(i, len(values)):
            p *= values[j]
            total += p < bound
    return total

for values in ([10, 5, 2, 6], [1, 1, 1], [3, 7, 2, 9, 1]):
    for bound in range(0, 120, 7):
        assert count_product_below(values, bound) == count_product_brute(values, bound)
```

## Replacements: validity from a maximum count

A window can be turned into one repeated letter with at most `k` replacements exactly when `length - (count of its most frequent letter) <= k`. Removing a letter lowers the length by one and the top count by at most one, so the property is closed under shrinking and the longest-window pattern applies, with a 26-entry count table.

## Window maxima with a monotonic queue

The maximum of each window of size `k` cannot be kept in one variable: when the maximum leaves, the next maximum is unknown. A **monotonic queue** keeps the positions of values that could still become a window maximum, in decreasing order of value. A new value removes every smaller value behind it, because those can never be a maximum again while the new value stays in the window, and it leaves the window later than them.

```python-run
from collections import deque

def window_maxima(values, k):
    q = deque()                               # positions; values strictly decreasing
    out = []
    for right, v in enumerate(values):
        while q and values[q[-1]] <= v:
            q.pop()                           # dominated: smaller and leaves earlier
        q.append(right)
        if q[0] <= right - k:
            q.popleft()                       # the front left the window
        if right >= k - 1:
            out.append(values[q[0]])
    return out

data = [1, 3, -1, -3, 5, 3, 6, 7]
assert window_maxima(data, 3) == [3, 3, 5, 5, 6, 7]
for k in range(1, len(data) + 1):
    assert window_maxima(data, k) == [max(data[i:i + k]) for i in range(len(data) - k + 1)]
```

## Worked example

Count windows of `[1, 2, 1, 2, 3]` with exactly 2 distinct values. With at most 2, the minimal left boundary for right = 0..4 is 0, 0, 0, 0, 3, giving window counts 1, 2, 3, 4, 2: a total of 12. With at most 1, the counts are 1, 1, 1, 1, 1: a total of 5. So exactly 2 gives $12 - 5 = 7$: the windows `[1,2]`, `[2,1]`, `[1,2]`, `[2,3]`, `[1,2,1]`, `[2,1,2]` and `[1,2,1,2]`.

## Correctness

The counting argument needs two facts: after the inner loop, `left` equals $L(right)$, the smallest valid start; and closure under shrinking makes every start from $L(right)$ to `right` valid. The first holds because `left` only advances while the window is invalid, and $L$ never decreases. The monotonic queue keeps the invariant: positions in the queue are inside the window, in increasing order, with strictly decreasing values, and the window maximum is at the front. Every removed position is either outside the window or dominated by a later, larger value.

## Complexity

All counting functions are $\Theta(n)$: each position enters and leaves at most once. The exactly-`k` count runs two linear passes. The monotonic queue is also $\Theta(n)$: each position is appended once and popped at most once, so the inner `while` loop runs at most $n$ times in total. Extra space is $O(k)$ for the queue and $O(\min(n, \sigma))$ for the frequency maps.

## Common mistakes

- Using the counting formula `right - left + 1` for a property that is not closed under shrinking.
- Computing `count_at_most(k - 1)` with `k - 1 = -1` without the guard.
- Using a product window with zeros or negative values.
- Popping only equal values from the queue, or popping the front without checking that it actually left the window.

## Practice exercises

1. Count the windows of a list of nonnegative integers whose sum is at most a bound.
2. Count the windows whose sum equals a target exactly, for nonnegative values, using two "at most" counts. Why does this need nonnegative values?
3. Adapt `window_maxima` to report window minima.
4. Prove that the queue never holds more than `k` positions.

The final lesson gathers the amortised analysis, the limitations, and the method to use when a window does not apply.

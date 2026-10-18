## Learning objectives

Grow and shrink a window according to a validity condition, solve "shortest valid window" and "longest valid window" problems in linear time, state exactly where nonnegative values are required, and demonstrate the failure on a counterexample with a negative value. Prerequisites: fixed-size windows and the monotonicity condition from the first lesson.

## Expand, then contract

A variable window has two moves. **Expanding** adds the next value on the right. **Contracting** removes the value on the left. The loop expands once per position and contracts as many times as the validity rule allows. Two patterns cover most problems:

- **Shortest valid window.** Expand until the window is valid, then contract while it stays valid, recording its length each time. Requires that growing a valid window keeps it valid.
- **Longest valid window.** Expand; whenever the window becomes invalid, contract until it is valid again; then record its length. Requires that shrinking a valid window keeps it valid.

## Shortest window reaching a target

Find the length of the shortest contiguous run whose sum is at least a target. The visualization traces expansion and contraction, marks whether the current window is valid, and shows the best window so far. If you enter a negative value, it refuses the input and explains why.

```viz
algorithm: sliding-window
mode: shortest
input: 2, 3, 1, 2, 4, 3
target: 7
```

```python-run
def shortest_reaching(values, target):
    best = 0
    window = 0
    left = 0
    for right, value in enumerate(values):
        window += value                      # expand
        while window >= target:              # valid: try to shorten
            length = right - left + 1
            if best == 0 or length < best:
                best = length
            window -= values[left]           # contract
            left += 1
    return best

def shortest_brute(values, target):
    lengths = [j - i for i in range(len(values)) for j in range(i + 1, len(values) + 1) if sum(values[i:j]) >= target]
    return min(lengths, default=0)

assert shortest_reaching([2, 3, 1, 2, 4, 3], 7) == 2     # [4, 3]
assert shortest_reaching([1, 1, 1], 5) == 0
assert shortest_reaching([0, 0, 6, 0], 6) == 1           # zeros are fine: nonnegative suffices
for case in ([5, 1, 3, 5, 10, 7, 4, 9, 2, 8], [1, 2, 3, 4, 5], [0, 4, 0, 4]):
    for target in range(1, 25):
        assert shortest_reaching(case, target) == shortest_brute(case, target)
print(shortest_reaching([2, 3, 1, 2, 4, 3], 7))
```

## Longest window within a limit

The mirror problem: the longest run whose sum is at most a bound. Expand, and while the sum exceeds the bound, contract.

```python-run
def longest_within(values, bound):
    best = 0
    window = 0
    left = 0
    for right, value in enumerate(values):
        window += value
        while window > bound and left <= right:
            window -= values[left]
            left += 1
        best = max(best, right - left + 1)
    return best

def longest_within_brute(values, bound):
    return max((j - i for i in range(len(values)) for j in range(i + 1, len(values) + 1) if sum(values[i:j]) <= bound), default=0)

for case in ([3, 1, 2, 7, 4, 2, 1, 1, 5], [0, 0, 0], [9, 9]):
    for bound in range(0, 15):
        assert longest_within(case, bound) == longest_within_brute(case, bound)
```

## Where nonnegative values are required

Both algorithms rely on this fact about sums: **if every value is nonnegative, adding a value never decreases the window's sum, and removing one never increases it.** So a window that reaches the target still reaches it when extended, and a window within the bound stays within it when shortened. Zeros are allowed; strictly positive values are not needed for these two problems.

With a negative value the fact is false, and both algorithms return wrong answers, not just slow ones. Each counterexample below is checked against the brute-force version:

```python-run
def shortest_reaching(values, target):
    best = window = left = 0
    for right, value in enumerate(values):
        window += value
        while window >= target:
            best = right - left + 1 if best == 0 else min(best, right - left + 1)
            window -= values[left]
            left += 1
    return best

def longest_within(values, bound):
    best = window = left = 0
    for right, value in enumerate(values):
        window += value
        while window > bound and left <= right:
            window -= values[left]
            left += 1
        best = max(best, right - left + 1)
    return best

def window_sums(values):
    return [(j - i, sum(values[i:j])) for i in range(len(values)) for j in range(i + 1, len(values) + 1)]

def shortest_brute(values, target):
    return min((length for length, total in window_sums(values) if total >= target), default=0)

def longest_within_brute(values, bound):
    return max((length for length, total in window_sums(values) if total <= bound), default=0)

# Shortest window: a negative value keeps the sum below the target, so the window never
# becomes valid, never contracts, and keeps carrying the harmful prefix.
assert shortest_brute([4, -5, 3, 3], 6) == 2        # [3, 3]
assert shortest_reaching([4, -5, 3, 3], 6) == 0     # wrong: reports that no window exists

# Longest window: the window [4] exceeds the bound, so 4 is discarded for good, but the
# whole list 4 - 3 + 2 = 3 fits once -3 arrives.
assert longest_within_brute([4, -3, 2], 3) == 3
assert longest_within([4, -3, 2], 3) == 2           # wrong: the window dropped 4 too early
print("shortest:", shortest_reaching([4, -5, 3, 3], 6), "instead of 2; longest:", longest_within([4, -3, 2], 3), "instead of 3")
```

In the first case the window `[4, -5, 3, 3]` sums to 5, below 6, although its suffix `[3, 3]` reaches 6: removing a value **raised** the sum. In the second, a window that failed became valid again by **growing**. Both contradict the monotonicity the contraction rules assume. For arbitrary integers, use prefix sums instead, as the last lesson of this module shows.

## Worked example

`shortest_reaching([2, 3, 1, 2, 4, 3], 7)`: expand to `[2, 3, 1, 2]`, sum 8, valid with length 4; contract to `[3, 1, 2]`, sum 6, invalid. Expand to `[3, 1, 2, 4]`, sum 10, length 4; contract to `[1, 2, 4]`, sum 7, length 3, the best so far; contract to `[2, 4]`, sum 6. Expand to `[2, 4, 3]`, sum 9, length 3; contract to `[4, 3]`, sum 7, length 2, the new best; contract to `[3]`. The answer is 2.

## Correctness

Both loops keep the **window-sum invariant**: `window` equals the sum of `values[left : right + 1]`, because expanding adds exactly the entering value and contracting subtracts exactly the leaving one. Every validity test is therefore a test of the true window.

For the shortest window, consider any position `left`. The algorithm advances `left` past it only after recording the window `[left, right]` for the first `right` at which the window became valid. Because values are nonnegative, every window starting at `left` and ending earlier is invalid, and every one ending later is longer. So the shortest valid window starting at `left`, if any, has been recorded. Every valid window starts at some `left`, so the minimum recorded length is the answer.

For the longest window, after the inner loop the window `[left, right]` is the longest valid window ending at `right`: any window starting further left contains a removed value whose removal was forced, and shrinking preserves validity, so starting further left would still exceed the bound.

## Complexity

`right` advances $n$ times. `left` only increases and never passes $n$, so the inner loop runs at most $n$ times **in total** across the whole execution, not per iteration. The total work is $\Theta(n)$ with $O(1)$ space. This is an amortised bound: one iteration of the outer loop may contract many times, but contractions are paid for by earlier expansions.

## Common mistakes

- Using `if` instead of `while` for contraction, which records too few windows.
- Recording the window length after contracting in the shortest problem, which records an invalid window.
- Forgetting `left <= right` when a single value can exceed the bound by itself.
- Applying either pattern to sums with negative values.

## Practice exercises

1. Find the length of the longest run of 1s after flipping at most `k` zeros in a list of 0s and 1s. What is the validity condition, and is it monotone?
2. Prove the amortised bound by giving each value one coin when it enters and spending it when it leaves.
3. Modify `shortest_reaching` to return the window's start and end, choosing the leftmost among the shortest.
4. Construct a list containing a negative value on which `shortest_reaching` returns a wrong length, and check it against `shortest_brute`.

Next, windows whose summary is a table of counts rather than a single number.

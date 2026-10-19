## Learning objectives

Prove that a variable window runs in linear time with an aggregate argument and with an accounting argument, write a correctness proof for any window algorithm from one template, recognise problems where a window gives wrong answers, and solve sum problems with negative values using prefix sums instead. Prerequisites: every earlier lesson in this module.

## Amortised analysis, twice

A variable-window loop has a `while` loop inside a `for` loop, which looks quadratic. It is linear, and there are two standard ways to show it.

**Aggregate argument.** Count the total work over the whole run rather than per iteration. The right boundary advances $n$ times. The left boundary only increases and never exceeds $n$, so across the entire run the inner loop body executes at most $n$ times. Total: at most $2n$ boundary moves, each with constant work, so $\Theta(n)$.

**Accounting argument.** Give every value two coins when it enters the window. One coin pays for its entry. The other is saved and pays for its removal later, if it is ever removed. No operation is ever unpaid and only $2n$ coins are issued, so the total cost is at most $2n$ units. This is the same accounting used for dynamic-array appends in the Arrays module, where cheap appends saved coins for expensive resizes.

Both arguments rely on one fact: **no boundary ever moves backwards**. An algorithm that resets `left` to an earlier position can be quadratic even though it looks like a window.

## A proof template for windows

1. **Summary invariant.** The summary (sum, counts, `missing`) describes exactly the current window `[left, right]`.
2. **Validity monotonicity.** State whether validity is closed under shrinking or under growing, and prove it for this problem. For sums, this is where nonnegative values are used.
3. **Boundary invariant.** After processing `right`: for a "longest" problem, `[left, right]` is the longest valid window ending at `right`; for a "shortest" problem, every start before `left` has had its shortest valid window recorded.
4. **Conclusion.** Every candidate window is covered by step 3 for some `right` or some `left`, so the best recorded window is optimal.

## Where windows give wrong answers

A window is wrong, not merely slow, when validity is not monotone. The common cases:

- **Sums with negative values.** Removing a value can raise the sum and adding one can lower it, so neither closure property holds.
- **Exact targets.** "Sum exactly `t`" is neither closed under shrinking nor under growing, even with nonnegative values; it is handled by subtracting two "at most" counts, which does need nonnegative values.
- **Non-contiguous answers.** Subsequences and subsets are not windows at all.
- **Summaries without cheap removal.** A median or a mode of the window needs more structure, such as two heaps or balanced trees.

## Prefix sums for arbitrary integers

Let $P[0] = 0$ and $P[i] = A[0] + \dots + A[i-1]$. The sum of `A[i:j]` is $P[j] - P[i]$, for any values, negative or not. Counting windows with sum exactly `t` becomes counting pairs $i < j$ with $P[j] - P[i] = t$, which a dictionary of earlier prefix sums answers in one pass.

```python-run
def count_sum_exactly(values, target):
    seen = {0: 1}                 # prefix sum -> how many times it occurred
    prefix = 0
    total = 0
    for v in values:
        prefix += v
        total += seen.get(prefix - target, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return total

def count_sum_exactly_brute(values, target):
    n = len(values)
    return sum(1 for i in range(n) for j in range(i + 1, n + 1) if sum(values[i:j]) == target)

for values in ([1, -1, 1, -1], [3, 4, -7, 1, 3, 3, 1, -4], [0, 0, 0], [5, -5]):
    for target in range(-6, 8):
        assert count_sum_exactly(values, target) == count_sum_exactly_brute(values, target)
print(count_sum_exactly([3, 4, -7, 1, 3, 3, 1, -4], 7))
```

The shortest window with sum at least a target, for arbitrary integers, also uses prefix sums: keep a queue of candidate start positions whose prefix sums increase, pop from the front while a start makes the window long enough, and pop from the back any start that a later, smaller prefix sum dominates. It is the monotonic queue of the previous lesson, applied to $P$.

```python-run
from collections import deque

def shortest_at_least_any_sign(values, target):
    prefix = [0]
    for v in values:
        prefix.append(prefix[-1] + v)
    best = 0
    starts = deque()
    for j, pj in enumerate(prefix):
        while starts and pj - prefix[starts[0]] >= target:
            length = j - starts.popleft()
            best = length if best == 0 else min(best, length)
        while starts and prefix[starts[-1]] >= pj:
            starts.pop()          # a later start with a smaller or equal prefix is never worse
        starts.append(j)
    return best

def shortest_brute(values, target):
    return min((j - i for i in range(len(values)) for j in range(i + 1, len(values) + 1) if sum(values[i:j]) >= target), default=0)

assert shortest_at_least_any_sign([4, -5, 3, 3], 6) == 2     # the case that broke the plain window
assert shortest_at_least_any_sign([2, -1, 2], 3) == 3
for values in ([1, -2, 3, -1, 4], [-3, 1, 1, 1], [5], [-1, -1]):
    for target in range(-3, 9):
        assert shortest_at_least_any_sign(values, target) == shortest_brute(values, target)
```

## Worked example

Count windows of `[3, 4, -7, 1, 3, 3, 1, -4]` with sum exactly 7. The prefix sums are 0, 3, 7, 0, 1, 4, 7, 8, 4. For each prefix, count earlier prefixes equal to it minus 7: prefix 7 at position 2 matches the 0 at position 0 (window `[3, 4]`); 7 at position 6 matches the 0s at positions 0 and 3 (windows `[3, 4, -7, 1, 3, 3]` and `[1, 3, 3]`); 4 at position 5 has no earlier prefix equal to -3; 8 at position 7 matches 1 at position 4 (`[3, 3, 1]`); 4 at position 8 has no earlier -3. Total 4, which the code prints.

## Correctness

For `count_sum_exactly`, the invariant before handling position `j` is: `seen` maps each value to how many of $P[0], \dots, P[j-1]$ equal it, and `total` counts windows ending before `j` with the target sum. A window ending at `j` with sum `t` starts at each earlier `i` with $P[i] = P[j] - t$, and `seen` counts exactly those. For the queue version, a start `i` is removed from the front only after recording the shortest window it can begin, since later ends are longer; a start is removed from the back only when a later start has a prefix sum no larger, which makes every window from the later start at least as good and shorter.

## Complexity

The prefix-sum count takes $\Theta(n)$ expected time and $\Theta(n)$ space for the dictionary. The queue version takes $\Theta(n)$ time because each position enters and leaves the queue at most once, and $\Theta(n)$ space for the prefix sums. The plain window used $O(1)$ space, so prefix sums trade space for the ability to handle any sign.

## Common mistakes

- Using a plain window for sums because the tests you tried had only positive values.
- Starting `seen` empty instead of `{0: 1}`, which misses windows that start at position 0.
- Claiming linear time for a loop whose left boundary can move backwards.
- Trusting a window algorithm without comparing it against a brute-force version on many random inputs, including negative values, zeros, empty input and repeated values.

## Practice exercises

1. Write a randomised differential test that compares `shortest_at_least_any_sign` with `shortest_brute` on a thousand random lists.
2. Find the longest window with sum exactly `t` for arbitrary integers, storing the **first** position of each prefix sum.
3. Explain, with a counterexample, why "longest window with an even sum" is not closed under shrinking.
4. Redo the accounting argument for the monotonic queue: how many coins does each position need?

This completes Sliding Window. The module project builds a streaming analytics tool on these ideas and asks you to justify every window you use.

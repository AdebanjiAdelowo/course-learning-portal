## Learning objectives

Reduce a triplet search to repeated pair searches, report each distinct triplet exactly once, find the pair whose sum is closest to a target, and prove an optimisation algorithm correct with an exchange argument when the data is not sorted. Prerequisites: the opposite-direction pair search and its invariant.

## Triplets: fix one, search two

To find every triplet of values with a given sum, sort the list and fix the smallest value of the triplet at position `i`. The other two values must sum to `target - nums[i]` and lie to the right of `i`, which is a pair search on a sorted suffix. Running it for every `i` gives $O(n^2)$ time, compared with $\Theta(n^3)$ for checking all triples.

The harder part is reporting each triplet once. Equal values create repeats in two places: two equal values at the fixed position, and equal values met by the inner pointers after a match. Skip both.

```python-run
from itertools import combinations

def triplets_with_sum(values, target):
    nums = sorted(values)
    found = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                       # same smallest value: same triplets again
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < target:
                lo += 1
            elif total > target:
                hi -= 1
            else:
                found.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1                # skip an equal middle value
                while lo < hi and nums[hi] == nums[hi + 1]:
                    hi -= 1                # skip an equal largest value
    return found

def triplets_brute(values, target):
    return sorted({tuple(sorted(c)) for c in combinations(values, 3) if sum(c) == target})

for case in ([-2, 0, 1, 1, 2], [0, 0, 0, 0], [3, -1, -1, 2, 0, -2, 1], [], [5, 5]):
    for target in range(-3, 4):
        assert [tuple(t) for t in triplets_with_sum(case, target)] == triplets_brute(case, target)
print(triplets_with_sum([-2, 0, 1, 1, 2], 0))
```

## The closest sum

Sometimes no pair reaches the target exactly, and we want the pair whose sum is closest. The same moves work: a sum below the target means the current smallest value cannot do better with any other partner, because every other partner is smaller than the largest. Record the distance before each move.

```python-run
from itertools import combinations

def closest_pair_sum(values, target):
    nums = sorted(values)
    lo, hi = 0, len(nums) - 1
    best = None
    while lo < hi:
        total = nums[lo] + nums[hi]
        if best is None or abs(total - target) < abs(best - target):
            best = total
        if total < target:
            lo += 1
        elif total > target:
            hi -= 1
        else:
            return total
    return best

def closest_brute(values, target):
    sums = [a + b for a, b in combinations(values, 2)]
    return min(sums, key=lambda s: (abs(s - target), sums.index(s))) if sums else None

assert closest_pair_sum([1, 4, 9, 13], 16) == 17
for case in ([5, 1, 9, 3], [-4, 8, 2, 2], [10, 20]):
    for target in range(-5, 30):
        assert abs(closest_pair_sum(case, target) - target) == abs(closest_brute(case, target) - target)
```

For `[1, 4, 9, 13]` and target 16, the candidate sums 4 + 13 = 17, 1 + 13 = 14 and 4 + 9 = 13 lie at distances 1, 2 and 3, so the answer is 17. Two different sums can be equally close, for example 15 and 17 for target 16. When that can happen, the contract must say which to return; the brute-force comparison above therefore checks distances, not sums.

## Optimisation without sorting: the widest container

Walls of heights `h[0..n-1]` stand at positions `0..n-1`. A pair `i < j` holds $(j - i) \cdot \min(h_i, h_j)$ units of water. The data is not sorted, yet two pointers still work, with a different argument. Start with the widest pair. Whichever wall is shorter limits the current pair, and every other pair using that wall is narrower and still limited by it, so none can hold more. Discard the shorter wall.

```python-run
from itertools import combinations

def max_container_area(heights):
    lo, hi, best = 0, len(heights) - 1, 0
    while lo < hi:
        best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
        if heights[lo] <= heights[hi]:
            lo += 1
        else:
            hi -= 1
    return best

def container_brute(heights):
    return max(((j - i) * min(heights[i], heights[j]) for i, j in combinations(range(len(heights)), 2)), default=0)

assert max_container_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
for case in ([3, 1, 2, 4, 5], [0, 0], [6], [2, 9, 9, 2], [1, 2, 3, 4, 5, 6]):
    assert max_container_area(case) == container_brute(case)
```

## Worked example

For heights `[1, 8, 6, 2, 5, 4, 8, 3, 7]`: the first pair (0, 8) holds $8 \cdot 1 = 8$; the wall of height 1 is shorter, so discard position 0. Pair (1, 8) holds $7 \cdot 7 = 49$; the wall of height 7 is shorter, so discard position 8. Pair (1, 7) holds $6 \cdot 3 = 18$, discard 7. Pair (1, 6) holds $5 \cdot 8 = 40$; the heights tie, discard position 1. The remaining pairs are narrower and none beats 49.

## Correctness

For triplets, the invariant of the inner search is the pair-search invariant applied to the suffix after `i`: no matching pair uses a position outside `[lo, hi]`. Skipping equal values is safe because a skipped position would only reproduce a triplet already recorded.

For the container, use an **exchange argument**. Suppose `h[lo] <= h[hi]`. For any `k` with `lo < k < hi`, the pair `(lo, k)` is narrower than `(lo, hi)`, and its height is at most `h[lo]`, which is also the height of `(lo, hi)`. So `(lo, k)` holds no more than the pair just recorded, and discarding `lo` loses nothing. Invariant: `best` is at least the capacity of every pair that uses a discarded position.

## Complexity

Triplets: $O(n \log n)$ to sort plus $n$ linear scans, $O(n^2)$ in total, with $O(1)$ extra space besides the sort and the output. Closest pair and container: one scan, $\Theta(n)$ time, $O(1)$ space, plus $O(n \log n)$ if sorting is needed.

## Common mistakes

- Skipping duplicates before recording the first match, which loses triplets such as `[-2, 1, 1]`.
- Comparing `nums[lo]` with `nums[lo + 1]` while skipping, which reads past `hi`.
- Moving the taller wall in the container problem; the exchange argument only discards the shorter one.
- Returning positions in the original list after sorting a copy.

## Practice exercises

1. Extend the triplet method to quadruplets. What is the running time, and where must duplicates be skipped?
2. Prove that `closest_pair_sum` never discards the optimal pair, in the style of the pair-search invariant.
3. Trace the container algorithm on `[2, 9, 9, 2]` and explain why moving either wall is safe when heights tie.
4. Count the pairs `i < j` in a sorted list with `A[j] - A[i] == d` for a positive `d`. Which pointer layout fits a difference rather than a sum?

The final lesson collects the proof patterns and gives a guide to choosing the right technique.

## Approach and correctness

Sort the values. For each position `i`, look for pairs to its right whose sum is `target - nums[i]`, using the opposite-direction pair search: the same invariant as in a pair sum shows that no pair is missed. Skipping a first value equal to the previous one avoids repeating triples that start with the same value. After recording a triple, advance both pointers past equal values, so the same `(b, c)` is not recorded twice for this `a`. Every reported triple has `a <= b <= c` because positions increase, and sorted iteration emits them in lexicographic order.

## Complexity

Sorting costs O(n log n). Each of the `n - 2` first positions runs a linear two-pointer scan, so the total is O(n^2) time. The work beyond the output is O(1) auxiliary space plus the space the sort uses; the result list holds the reported triples.

## Boundaries

Fewer than three values give `[]`. All-equal inputs such as `[0, 0, 0, 0]` give one triple. A value may repeat inside a triple only if it appears at enough different positions, so `[1, 2]` cannot form `[1, 1, 1]`. Negative targets work unchanged.

## Reference implementation

```python
def triplets_with_sum(values, target):
    nums = sorted(values)
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < target:
                lo += 1
            elif total > target:
                hi -= 1
            else:
                result.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
                while lo < hi and nums[hi] == nums[hi + 1]:
                    hi -= 1
    return result

assert triplets_with_sum([-2, 0, 1, 1, 2], 0) == [[-2, 0, 2], [-2, 1, 1]]
assert triplets_with_sum([0, 0, 0, 0], 0) == [[0, 0, 0]]
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

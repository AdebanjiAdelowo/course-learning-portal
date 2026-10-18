## Approach and correctness

A rearrangement of `pattern` has exactly `len(pattern)` letters, so only windows of that length can match: a fixed-size window. Keep the letter counts `need` of the pattern and `have` of the current window. Sliding one place adds the entering letter and removes the leaving one, so `have` always describes the current window. A window matches exactly when the two count arrays are equal, because two strings are rearrangements of each other exactly when their letter counts agree.

## Complexity

Each step does O(1) count updates and one comparison of two 26-entry arrays, so the time is O(26n), which is Theta(n) for this fixed alphabet. A counter of matching letters avoids the comparison but has the same asymptotic cost. Space is O(1) for the two arrays.

## Boundaries

A pattern longer than the text cannot match. Repeated letters must match in count: `"aab"` matches `"baa"` but not `"bab"`. The first comparison happens when the window first reaches full length, at `right == m - 1`.

## Reference implementation

```python
def contains_permutation(pattern, text):
    m = len(pattern)
    if m > len(text):
        return False
    need = [0] * 26
    have = [0] * 26
    for ch in pattern:
        need[ord(ch) - 97] += 1
    for right, ch in enumerate(text):
        have[ord(ch) - 97] += 1
        if right >= m:
            have[ord(text[right - m]) - 97] -= 1
        if right >= m - 1 and have == need:
            return True
    return False

assert contains_permutation("ab", "eidbaooo")
assert not contains_permutation("ab", "eidboaoo")
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

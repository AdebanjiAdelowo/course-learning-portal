## Approach and correctness

Invariant: `text[left:right + 1]` has no repeated character. When `text[right]` was last seen inside the window, the window must start after that position, so `left` jumps to `last_seen[ch] + 1`. Any window ending at `right` that starts earlier would contain both copies. A previous copy that lies before `left` is already outside the window and must be ignored, which is what the `>= left` check does: in `"abba"`, the second `a` has its earlier copy at position 0, but `left` is already 2, so `left` must not move back. Recording the latest position of every character keeps the dictionary correct.

## Complexity

Each position is visited once by `right`, and `left` only moves forwards: Theta(n) time. The dictionary holds at most one entry per distinct character, so space is O(min(n, alphabet size)). The equivalent shrink-one-at-a-time version with a frequency map has the same amortised bound.

## Boundaries

The empty string returns 0. A string with all characters distinct returns its length. Upper and lower case letters are different characters. Spaces count.

## Reference implementation

```python
def longest_distinct_run(text):
    last_seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(text):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best

assert longest_distinct_run("abcabcbb") == 3
assert longest_distinct_run("abba") == 2
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

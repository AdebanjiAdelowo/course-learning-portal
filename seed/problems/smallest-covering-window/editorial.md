## Approach and correctness

`missing` counts how many required characters, with multiplicity, the window still lacks. Adding a character reduces `missing` only if the window had fewer copies than required; removing one increases it only if the window drops below the requirement. So `missing == 0` exactly when the window covers the pattern. Expand right until the window covers, then shrink left while it still covers, recording each covering window. For a fixed `right`, the shrinking loop finds the shortest covering window that ends at `right`. Covering is monotone: adding characters never uncovers a window. So every candidate for the overall answer is checked. Recording only strictly shorter windows keeps the first, and so leftmost, of equally short windows, because windows are found in increasing order of their end and, for equal lengths, of their start.

## Complexity

Each position enters the window once and leaves it at most once, so the loop does Theta(n) dictionary updates; with the pattern counts this is O(n + m) time and O(alphabet) space. Comparing whole count tables after every step would add a factor of the alphabet size.

## Boundaries

If `pattern` is longer than `text`, or a needed character is absent, the answer is `""`. Multiplicity matters: `"bba"` with pattern `"ab"` gives `"ba"`. Characters not in the pattern are counted in `have` but never change `missing`.

## Reference implementation

```python
def smallest_covering_window(text, pattern):
    need = {}
    for ch in pattern:
        need[ch] = need.get(ch, 0) + 1
    missing = len(pattern)
    have = {}
    left = 0
    best_start, best_len = 0, 0
    for right, ch in enumerate(text):
        have[ch] = have.get(ch, 0) + 1
        if ch in need and have[ch] <= need[ch]:
            missing -= 1
        while missing == 0:
            if best_len == 0 or right - left + 1 < best_len:
                best_start, best_len = left, right - left + 1
            out = text[left]
            have[out] -= 1
            if out in need and have[out] < need[out]:
                missing += 1
            left += 1
    return text[best_start:best_start + best_len]

assert smallest_covering_window("ADOBECODEBANC", "ABC") == "BANC"
assert smallest_covering_window("a", "aa") == ""
```

## Self-review

Browser results are local feedback, not official grading. Explain your window invariant and your amortised bound in your own words before comparing with this editorial.

## Learning objectives

Summarise a window with a frequency map, update it in constant time per move, solve "longest substring without a repeat" and "at most k distinct values", find the smallest window that covers a pattern with multiplicity, and keep the map consistent with the window at every step. Prerequisites: variable-size windows and Python dictionaries from Python Module P2.

## A table of counts as the summary

When the validity of a window depends on which values it contains, a single running number is not enough. The summary becomes a **frequency map**: a dictionary from each value to how many times it occurs in the window. Expanding increments one count; contracting decrements one, and deletes the key when the count reaches zero, so that `len(counts)` is the number of **distinct** values in the window.

The visualization below finds the longest window in which no value repeats, showing the frequency map beside the window at every step. Integers stand in for characters; the logic is identical.

```viz
algorithm: sliding-window
mode: longest-distinct
input: 3, 1, 4, 1, 5, 9, 2, 6, 5, 3
```

```python-run
def longest_without_repeat(text):
    counts = {}
    left = 0
    best = 0
    for right, ch in enumerate(text):
        counts[ch] = counts.get(ch, 0) + 1
        while counts[ch] > 1:                 # the new character is repeated: invalid
            out = text[left]
            counts[out] -= 1
            if counts[out] == 0:
                del counts[out]
            left += 1
        best = max(best, right - left + 1)
    return best

def longest_without_repeat_brute(text):
    return max((j - i for i in range(len(text)) for j in range(i + 1, len(text) + 1) if len(set(text[i:j])) == j - i), default=0)

for text in ("abcabcbb", "bbbb", "", "pwwkew", "abba", "dvdf", "a b c a", "AaBb"):
    assert longest_without_repeat(text) == longest_without_repeat_brute(text)
assert longest_without_repeat("abcabcbb") == 3
print(longest_without_repeat("pwwkew"))
```

## At most k distinct values

The same shape answers "longest window with at most `k` distinct values": the window is invalid when `len(counts) > k`. Shrinking a window can only remove distinct values, so validity is monotone under shrinking and the longest-window pattern applies.

```python-run
def longest_at_most_k_distinct(values, k):
    counts = {}
    left = best = 0
    for right, v in enumerate(values):
        counts[v] = counts.get(v, 0) + 1
        while len(counts) > k:
            out = values[left]
            counts[out] -= 1
            if counts[out] == 0:
                del counts[out]
            left += 1
        best = max(best, right - left + 1)
    return best

def at_most_k_brute(values, k):
    return max((j - i for i in range(len(values)) for j in range(i + 1, len(values) + 1) if len(set(values[i:j])) <= k), default=0)

for values in ([1, 2, 1, 3, 4, 3, 5, 3], [7, 7, 7], [], [1, 2, 3]):
    for k in range(0, 4):
        assert longest_at_most_k_distinct(values, k) == at_most_k_brute(values, k)
```

## Covering a pattern

The smallest window of a text that contains every character of a pattern, counting repeats, needs two tables: what the pattern **needs** and what the window **has**. Comparing whole tables after every move would cost time proportional to the alphabet. Instead keep one integer, `missing`: how many required characters, with multiplicity, the window still lacks. It changes only when a needed character crosses its required count.

```python-run
from collections import Counter

def smallest_cover(text, pattern):
    need = Counter(pattern)
    have = Counter()
    missing = len(pattern)
    left = 0
    best = None
    for right, ch in enumerate(text):
        have[ch] += 1
        if have[ch] <= need[ch]:
            missing -= 1                      # this copy was still needed
        while missing == 0:
            if best is None or right - left + 1 < best[1] - best[0]:
                best = (left, right + 1)
            out = text[left]
            have[out] -= 1
            if have[out] < need[out]:
                missing += 1                  # removed a copy the window needed
            left += 1
    return text[best[0]:best[1]] if best else ""

def smallest_cover_brute(text, pattern):
    need = Counter(pattern)
    for length in range(len(pattern), len(text) + 1):
        for i in range(len(text) - length + 1):
            if not need - Counter(text[i:i + length]):
                return text[i:i + length]
    return ""

assert smallest_cover("ADOBECODEBANC", "ABC") == "BANC"
assert smallest_cover("a", "aa") == ""
for text, pattern in (("bba", "ab"), ("acbbaca", "aba"), ("xyz", "q"), ("aaab", "aab"), ("cabwefgewcwaefgcf", "cae")):
    assert smallest_cover(text, pattern) == smallest_cover_brute(text, pattern)
```

`need[ch]` for a character not in the pattern is 0, because `Counter` returns 0 for missing keys, so extra characters never change `missing`.

## Worked example

`longest_without_repeat("abba")`: add `a`, window `"a"`, best 1. Add `b`, `"ab"`, best 2. Add `b`: `b` now has count 2, so contract: remove `a` (count of `b` still 2), remove `b` (count 1). The window is `"b"`. Add `a`: window `"ba"`, length 2. The answer is 2. Note that the second `a` does not cause any removal, because the first `a` already left the window.

## Correctness

The invariant for every algorithm in this lesson is: **`counts` (or `have`) equals the frequency table of exactly `text[left : right + 1]`**. Expanding adds one character to both the window and the table; contracting removes one from both. With that invariant, each validity test is a statement about the true window. Validity is monotone under shrinking for "no repeats" and "at most k distinct", and monotone under growing for "covers the pattern", so the longest-window and shortest-window arguments of the previous lesson apply unchanged.

For `missing`, the invariant is `missing = sum over c of max(0, need[c] - have[c])`. An added copy of `c` reduces that sum by one exactly when `have[c]` was below `need[c]`, which is the test `have[ch] <= need[ch]` after incrementing. A removal is symmetric.

## Complexity

Each character enters the window once and leaves at most once, and each move costs $O(1)$ expected time for dictionary operations, so all three algorithms take $\Theta(n)$ expected time (plus $O(m)$ to count the pattern). The maps hold at most one key per distinct character in the window: $O(\min(n, \sigma))$ space for alphabet size $\sigma$.

## Common mistakes

- Not deleting zero counts, so `len(counts)` overstates the number of distinct values.
- Testing `while counts[out] > 1` with the leaving character instead of the entering one.
- Treating the pattern as a set and ignoring multiplicity: `"aa"` is not covered by `"a"`.
- Recording the cover after the contraction step, when the window may no longer cover the pattern.

## Practice exercises

1. Find every start index of a rearrangement of a pattern using a variable window that never grows beyond the pattern's length.
2. Return the leftmost longest window with at most two distinct values, as start and end positions.
3. Prove that `missing` reaches 0 exactly when the window covers the pattern.
4. Replace the frequency map in `longest_without_repeat` by a map from each character to its last position, and explain the jump `left = last[ch] + 1` with the `abba` example.

The next lesson studies validity itself: what monotonicity means, how to count windows, and how a monotonic queue handles window maxima.

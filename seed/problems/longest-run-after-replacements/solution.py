def longest_run_after_replacements(text, k):
    counts = [0] * 26
    left = 0
    best = 0
    for right, ch in enumerate(text):
        counts[ord(ch) - 65] += 1
        while (right - left + 1) - max(counts) > k:
            counts[ord(text[left]) - 65] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

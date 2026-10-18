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

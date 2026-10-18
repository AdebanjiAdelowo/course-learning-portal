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

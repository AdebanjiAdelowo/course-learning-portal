def count_shifts(items: list[int]) -> int:
    work = list(items)
    shifts = 0
    for j in range(1, len(work)):
        key = work[j]
        i = j - 1
        while i >= 0 and work[i] > key:
            work[i + 1] = work[i]
            shifts += 1
            i -= 1
        work[i + 1] = key
    return shifts

def count_occurrences(items: list[int], target: int) -> int:
    def boundary(strict: bool) -> int:
        lo, hi = 0, len(items)
        while lo < hi:
            mid = (lo + hi) // 2
            below = items[mid] <= target if strict else items[mid] < target
            if below:
                lo = mid + 1
            else:
                hi = mid
        return lo

    return boundary(strict=True) - boundary(strict=False)

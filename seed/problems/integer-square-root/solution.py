def integer_sqrt(n: int) -> int:
    lo, hi = 0, n + 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if mid * mid <= n:
            lo = mid
        else:
            hi = mid
    return lo

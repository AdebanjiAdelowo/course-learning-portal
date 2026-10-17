def balanced_sum(items: list[int]) -> int:
    def visit(lo, hi):
        if lo == hi:
            return 0
        if hi - lo == 1:
            return items[lo]
        mid = (lo + hi) // 2
        return visit(lo, mid) + visit(mid, hi)
    return visit(0, len(items))

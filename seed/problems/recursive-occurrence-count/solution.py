def count_recursive(items: list[int], target: int) -> int:
    def visit(lo, hi):
        if lo == hi:
            return 0
        if hi - lo == 1:
            return int(items[lo] == target)
        mid = (lo + hi) // 2
        return visit(lo, mid) + visit(mid, hi)
    return visit(0, len(items))

def recursive_search(items: list[int], target: int) -> int:
    def visit(lo, hi):
        if lo == hi:
            return -1
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            return visit(mid + 1, hi)
        return visit(lo, mid)
    return visit(0, len(items))

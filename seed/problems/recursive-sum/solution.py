def recursive_sum(items: list[int]) -> int:
    def visit(i):
        if i == len(items):
            return 0
        return items[i] + visit(i + 1)
    return visit(0)

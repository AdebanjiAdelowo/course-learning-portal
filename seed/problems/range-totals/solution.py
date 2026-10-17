def range_totals(items, queries):
    prefix = [0]
    for value in items:
        prefix.append(prefix[-1] + value)
    return [prefix[right] - prefix[left] for left, right in queries]

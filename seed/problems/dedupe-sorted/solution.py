def dedupe_sorted(values):
    if not values:
        return []
    write = 1
    for read in range(1, len(values)):
        if values[read] != values[write - 1]:
            values[write] = values[read]
            write += 1
    return values[:write]

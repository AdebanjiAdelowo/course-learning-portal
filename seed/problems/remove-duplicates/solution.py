def remove_duplicates(items: list[int]) -> list[int]:
    result = []
    seen = set()
    for value in items:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result

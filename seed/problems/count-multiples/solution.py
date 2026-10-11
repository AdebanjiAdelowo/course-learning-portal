def count_multiples(low: int, high: int, d: int) -> int:
    count = 0
    for n in range(low, high + 1):
        if n % d == 0:
            count += 1
    return count

def shortest_reaching_sum(values, target):
    best = 0
    window = 0
    left = 0
    for right, value in enumerate(values):
        window += value
        while window >= target:
            length = right - left + 1
            if best == 0 or length < best:
                best = length
            window -= values[left]
            left += 1
    return best

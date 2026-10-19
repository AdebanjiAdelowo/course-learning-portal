def best_window_sum(values, k):
    window = sum(values[:k])
    best = window
    for right in range(k, len(values)):
        window += values[right] - values[right - k]
        best = max(best, window)
    return best

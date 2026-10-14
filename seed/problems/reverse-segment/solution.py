def reverse_segment(items, left, right):
    right -= 1
    while left < right:
        items[left], items[right] = items[right], items[left]
        left += 1
        right -= 1
    return items

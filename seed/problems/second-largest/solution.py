def second_largest(items: list[int]) -> int:
    largest = second = None
    for value in items:
        if largest is None or value > largest:
            largest, second = value, largest
        elif value != largest and (second is None or value > second):
            second = value
    return second

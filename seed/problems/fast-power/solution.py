def power(base: int, exponent: int) -> int:
    if exponent == 0:
        return 1
    if exponent % 2 == 0:
        half = power(base, exponent // 2)
        return half * half
    return base * power(base, exponent - 1)

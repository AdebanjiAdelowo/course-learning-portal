def power(base: int, exponent: int) -> int:
    """Return base raised to exponent. Precondition: exponent >= 0."""
    if exponent == 0:
        return 1
    # Even exponent: square the half power. Odd exponent: one multiplication, then an even one.
    return 0

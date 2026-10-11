Given integers `base` and `exponent`, with `exponent >= 0`, return `base` raised to the power `exponent`.

By convention any number to the power 0 is 1, including `power(0, 0)`.

Write the function **recursively**, using the fact that an even power is a square: $b^n = (b^{n/2})^2$ when $n$ is even, and $b^n = b \cdot b^{n-1}$ when $n$ is odd. Your solution must make a number of calls that grows like $\log n$, not like $n$.

Do not use the `**` operator, `pow`, or the `math` module.

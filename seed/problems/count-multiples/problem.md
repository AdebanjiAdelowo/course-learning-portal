Given integers `low`, `high` and `d`, with `d >= 1`, return how many integers `n` with `low <= n <= high` are multiples of `d`.

Both ends are included. If `low > high` the range is empty and the answer is 0.

A number `n` is a multiple of `d` when `n % d == 0`. Zero is a multiple of every `d`, and negative numbers can be multiples too: -6 is a multiple of 3.

A loop over the range is the expected solution.

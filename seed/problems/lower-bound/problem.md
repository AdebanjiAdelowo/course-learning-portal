Given a list `items` sorted in non-decreasing order and an integer `target`, return the smallest index `i` such that `items[i] >= target`. If every element is smaller than `target`, return `len(items)`.

Equivalently, return the position at which `target` could be inserted while keeping the list sorted and placing it before any equal elements.

Your solution must run in $O(\log n)$ time. Do not use the `bisect` module.

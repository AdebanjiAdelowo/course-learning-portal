Given a list `items` sorted in non-decreasing order and an integer `target`, return the number of times `target` occurs in the list.

Your solution must run in $O(\log n)$ time, even when the answer itself is large. A scan that counts matches one by one takes time proportional to the number of matches and does not meet the requirement.

Do not use `list.count` or the `bisect` module.

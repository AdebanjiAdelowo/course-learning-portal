## 1. Motivation

Linear search makes up to $n$ comparisons. For a million elements that is a million. If the list is **sorted**, the same question can be answered with at most 20.

The gain comes from structure in the input. This is the first example of a theme that runs through the whole course: organise the data so that each step can discard a large part of the remaining work.

## 2. Intuition

Think of a number between 1 and 100 and let a friend guess, answering only "too low", "too high" or "correct". A sensible guesser starts at 50. Whatever the answer, half of the candidates are eliminated. Seven guesses always suffice, because $2^7 = 128 > 100$.

Binary search does the same on a sorted list. Compare the target with the middle element. Because the list is sorted, one comparison rules out everything on one side.

## 3. Visualization

The shaded region is the part of the list that could still contain the target. Watch it halve. Then try a target that is absent, and a list of length 1.

```viz
algorithm: binary-search
input: 3, 8, 12, 17, 23, 31, 42, 56, 64, 71
target: 42
```

## 4. Formal explanation

**Problem.**

- *Input:* a sequence $A = \langle a_0, \dots, a_{n-1} \rangle$ of $n \ge 0$ integers in non-decreasing order, $a_0 \le a_1 \le \dots \le a_{n-1}$, and an integer $x$.
- *Output:* an index $i$ with $a_i = x$, or $-1$ if $x$ does not occur.

The sortedness of $A$ is a **precondition**. The algorithm is only required to be correct when it holds. On an unsorted list its answer means nothing.

The algorithm maintains two indices $lo$ and $hi$ that delimit the *candidate range* $a_{lo}, \dots, a_{hi}$, inclusive at both ends.

**Invariant.** At the start of every iteration: if $x$ occurs in $A$ at all, then it occurs at some index $i$ with $lo \le i \le hi$.

Equivalently, $x$ does not occur at any index below $lo$ or above $hi$.

## 5. Pseudocode

```text
BINARY-SEARCH(A, x)
1  lo = 0
2  hi = n - 1
3  while lo <= hi
4      mid = floor((lo + hi) / 2)
5      if A[mid] == x
6          return mid
7      else if A[mid] < x
8          lo = mid + 1
9      else
10         hi = mid - 1
11 return -1
```

## 6. Python implementation

```python
def binary_search(items: list[int], target: int) -> int:
    """Return an index i with items[i] == target, or -1.

    Precondition: items is sorted in non-decreasing order.
    """
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


data = [3, 8, 12, 17, 23, 31, 42, 56, 64, 71]
assert binary_search(data, 42) == 6
assert binary_search(data, 3) == 0           # first element
assert binary_search(data, 71) == 9          # last element
assert binary_search(data, 40) == -1         # absent, between two elements
assert binary_search(data, 1) == -1          # absent, below everything
assert binary_search(data, 99) == -1         # absent, above everything
assert binary_search([], 5) == -1            # empty input
assert binary_search([5], 5) == 0            # single element, present
assert binary_search([5], 4) == -1           # single element, absent
```

It is worth testing against a method we already trust. The check below compares binary search with a plain scan on every sorted list drawn from a small range, and every target.

```python
from itertools import combinations_with_replacement

for length in range(0, 6):
    for combo in combinations_with_replacement(range(6), length):
        items = list(combo)
        for target in range(-1, 7):
            index = binary_search(items, target)
            if target in items:
                assert items[index] == target
            else:
                assert index == -1
```

**Three details that are easy to get wrong.**

- The loop condition is `lo <= hi`, not `lo < hi`. With `<`, a range of one element is never examined.
- The updates are `mid + 1` and `mid - 1`, not `mid`. Using `mid` can leave the range unchanged and loop for ever.
- In languages with fixed-width integers, `lo + hi` can overflow, and `lo + (hi - lo) // 2` is used instead. Python integers do not overflow, so either form is safe here.

## 7. Correctness

**Initialisation.** Before the first iteration $lo = 0$ and $hi = n - 1$. The range is the whole list, so if $x$ occurs it occurs in the range.

**Maintenance.** Assume the invariant holds and the loop body runs, so $lo \le mid \le hi$.

- If $a_{mid} = x$, the function returns a correct index.
- If $a_{mid} < x$, then since $A$ is sorted, $a_i \le a_{mid} < x$ for every $i \le mid$. So $x$ does not occur at any index up to $mid$. Combined with the invariant, if $x$ occurs it does so in $mid + 1, \dots, hi$. Setting $lo = mid + 1$ restores the invariant.
- If $a_{mid} > x$, the symmetric argument shows $x$ does not occur at any index from $mid$ upward, and setting $hi = mid - 1$ restores the invariant.

This is the only place where sortedness is used, and without it the step fails.

**Exit.** If the loop ends, then $lo > hi$ and the candidate range is empty. By the invariant, if $x$ occurred it would be in that empty range. So $x$ does not occur, and $-1$ is correct.

**Termination.** Let $s = hi - lo + 1$ be the size of the range. In an iteration that does not return, the new size is either $hi - mid$ or $mid - lo$, and both are at most $\lfloor s/2 \rfloor$. In particular the size strictly decreases, it is a non-negative integer, and so the loop cannot run for ever.

## 8. Complexity

**Claim.** On a list of length $n \ge 1$, binary search runs at most $\lfloor \log_2 n \rfloor + 1$ iterations.

**Proof.** The range starts with size $n$ and after each non-returning iteration has size at most half the previous, rounded down. After $k$ such iterations the size is at most $\lfloor n / 2^k \rfloor$. An iteration can only begin when the size is at least 1, which requires $n / 2^k \ge 1$, that is $k \le \log_2 n$. So iterations begin only for $k = 0, 1, \dots, \lfloor \log_2 n \rfloor$, which is $\lfloor \log_2 n \rfloor + 1$ of them. $\blacksquare$

| | Linear search | Binary search |
| --- | --- | --- |
| Precondition | none | sorted input |
| Worst-case iterations | $n$ | $\lfloor \log_2 n \rfloor + 1$ |
| Worst-case time | $\Theta(n)$ | $\Theta(\log n)$ |
| Extra space | $\Theta(1)$ | $\Theta(1)$ |

For $n = 1\,000\,000$ the bound is $\lfloor 19.93 \rfloor + 1 = 20$.

```python
import math


def binary_search_iterations(items: list[int], target: int) -> int:
    """Number of loop iterations binary search performs."""
    lo, hi, iterations = 0, len(items) - 1, 0
    while lo <= hi:
        iterations += 1
        mid = (lo + hi) // 2
        if items[mid] == target:
            break
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return iterations


for n in range(1, 300):
    items = list(range(n))
    worst = max(binary_search_iterations(items, target) for target in range(-1, n + 1))
    assert worst == math.floor(math.log2(n)) + 1
```

The check confirms more than the claim: the bound is attained for every $n$ tested, so it cannot be improved.

The price is the precondition. Sorting costs more than one linear search, so binary search pays off when the same list is searched many times.

## 9. Worked example

Search for $x = 23$ in $A = \langle 3, 8, 12, 17, 23, 31, 42, 56 \rangle$, so $n = 8$.

| Iteration | $lo$ | $hi$ | $mid$ | $a_{mid}$ | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 7 | 3 | 17 | $17 < 23$, so $lo = 4$ |
| 2 | 4 | 7 | 5 | 31 | $31 > 23$, so $hi = 4$ |
| 3 | 4 | 4 | 4 | 23 | found, return 4 |

Three iterations, within the bound $\lfloor \log_2 8 \rfloor + 1 = 4$.

Now search for $x = 20$, which is absent. The first two iterations are identical. In the third, $a_4 = 23 > 20$ gives $hi = 3$. Now $lo = 4 > hi = 3$, the range is empty, and the result is $-1$.

## 10. Practice

1. Trace the search for $x = 56$ in the list above. How many iterations does it take?
2. With duplicates, which index does the algorithm return for $x = 5$ in $\langle 5, 5, 5, 5 \rangle$? Is it the first occurrence? What does this tell you about the output condition in section 4?
3. Change line 3 of the pseudocode to `while lo < hi`. Find the smallest input on which the modified algorithm gives a wrong answer.
4. The standard library provides this search in the `bisect` module. Read its documentation and explain the difference between `bisect_left` and `bisect_right`.

Then solve **Lower bound**, **Count occurrences** and **Integer square root** in the practice problems. Each one is binary search with a different invariant.

## 11. Assessment

- [ ] State the precondition and the invariant of binary search.
- [ ] Prove maintenance, pointing out exactly where sortedness is used.
- [ ] Prove termination using the size of the candidate range.
- [ ] Derive the bound $\lfloor \log_2 n \rfloor + 1$ on the number of iterations.

## 12. Further study

- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition), the exercises of section 2.3, where binary search and its analysis are posed as a problem.
- Kleinberg and Tardos, *Algorithm Design*, section 2.4, where binary search is the standard example of logarithmic time.
- Python documentation, the `bisect` module: array bisection algorithms in the standard library.
- Bentley, *Programming Pearls* (2nd edition, Addison-Wesley, 1999), column 4, a classic account of how hard it is to write this short program correctly.

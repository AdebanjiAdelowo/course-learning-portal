## 1. Motivation

Binary search needs sorted input, so sorting is the next problem to solve. It is also the best laboratory in the subject: there are many algorithms for it, with different costs, and comparing them teaches most of the techniques of algorithm analysis.

Insertion sort is not the fastest of them. We study it first because it is short, because its correctness proof is a model of the invariant method, and because its cost depends on the input in a way that can be stated exactly.

## 2. Intuition

Picture sorting a hand of playing cards as they are dealt. The cards already in your hand are in order. You pick up the next card and slide it leftward past every card that is larger, stopping at the first card that is not. Your hand is in order again, and one card longer.

Insertion sort does this inside a single list. A prefix of the list plays the role of the hand. Each step takes the next element and inserts it into the sorted prefix by shifting larger elements one place to the right.

## 3. Visualization

The green cells are the sorted prefix. The highlighted value is the key being inserted. Try an input that is already sorted, then one in reverse order, and compare the number of steps.

```viz
algorithm: insertion-sort
input: 31, 12, 45, 8, 27, 19
```

## 4. Formal explanation

**The sorting problem.**

- *Input:* a sequence $A = \langle a_0, \dots, a_{n-1} \rangle$ of $n \ge 0$ integers.
- *Output:* a reordering $\langle a'_0, \dots, a'_{n-1} \rangle$ of the input such that $a'_0 \le a'_1 \le \dots \le a'_{n-1}$.

The output condition has **two** parts, and both must be proved: the result is in order, and it is a *permutation* of the input, containing the same values with the same multiplicities. An algorithm that overwrites every element with zero produces an ordered list and is not a sorting algorithm.

Three properties are used to compare sorting algorithms.

| Property | Meaning | Insertion sort |
| --- | --- | --- |
| In place | Uses $O(1)$ memory besides the input | Yes |
| Stable | Equal elements keep their original relative order | Yes |
| Adaptive | Runs faster on input that is already nearly sorted | Yes |

**Invariant.** At the start of each iteration of the outer loop with index $j$, the prefix $A[0..j-1]$ consists of the elements that were originally in $A[0..j-1]$, in sorted order.

## 5. Pseudocode

```text
INSERTION-SORT(A)
1  for j = 1 to n - 1
2      key = A[j]
3      i = j - 1
4      while i >= 0 and A[i] > key
5          A[i + 1] = A[i]
6          i = i - 1
7      A[i + 1] = key
```

## 6. Python implementation

```python
def insertion_sort(items: list[int]) -> None:
    """Sort items in place into non-decreasing order."""
    for j in range(1, len(items)):
        key = items[j]
        i = j - 1
        while i >= 0 and items[i] > key:
            items[i + 1] = items[i]
            i -= 1
        items[i + 1] = key


def sorted_copy(items: list[int]) -> list[int]:
    result = list(items)
    insertion_sort(result)
    return result


assert sorted_copy([31, 12, 45, 8, 27, 19]) == [8, 12, 19, 27, 31, 45]
assert sorted_copy([]) == []
assert sorted_copy([7]) == [7]
assert sorted_copy([2, 1]) == [1, 2]
assert sorted_copy([3, 3, 1, 3]) == [1, 3, 3, 3]          # duplicates
assert sorted_copy([1, 2, 3, 4]) == [1, 2, 3, 4]          # already sorted
assert sorted_copy([4, 3, 2, 1]) == [1, 2, 3, 4]          # reverse order
assert sorted_copy([-5, 0, -1]) == [-5, -1, 0]            # negative values
```

As with binary search, compare against a trusted method on every small input. The built-in `sorted` is the reference.

```python
from itertools import product

for length in range(0, 7):
    for values in product(range(4), repeat=length):
        assert sorted_copy(list(values)) == sorted(values)
```

Two details in the inner loop matter.

- The test `i >= 0` comes **first**. Python evaluates `and` left to right and stops early, so `items[i]` is never read with a negative `i`. With the tests the other way round, `items[-1]` would silently read the last element.
- The comparison is `>`, not `>=`. With `>=` the algorithm still sorts, but equal elements would pass each other and stability would be lost.

## 7. Correctness

**Initialisation.** Before the first iteration $j = 1$. The prefix $A[0..0]$ is a single element, which is its own original content and is trivially sorted.

**Maintenance.** Assume the invariant holds at the start of iteration $j$, so $A[0..j-1]$ is sorted. The inner loop moves each element greater than $key$ one place to the right, starting from the right-hand end of the prefix. It stops at the first index $i$ for which $i < 0$ or $A[i] \le key$. At that moment:

- every element in positions $i+2, \dots, j$ is greater than $key$, because each was shifted there after comparing greater;
- every element in positions $0, \dots, i$ is at most $key$, because $A[i] \le key$ and the prefix was sorted;
- position $i + 1$ is free, since its former content has been copied to $i + 2$, or it is position $j$ itself whose content is saved in $key$.

Line 7 writes $key$ into position $i + 1$. Now $A[0..j]$ is sorted, and it holds exactly the original elements of $A[0..j]$, because elements were only moved, never discarded or duplicated. That is the invariant for $j + 1$.

**Exit.** The outer loop ends with $j = n$. The invariant then says $A[0..n-1]$ is a sorted permutation of the original list, which is the output condition.

**Termination.** The inner loop decreases $i$ on each pass and stops when $i < 0$ at the latest. The outer loop runs $n - 1$ times.

**Stability.** An element is shifted past $key$ only if it is strictly greater. An element equal to $key$ that was originally to its left stays to its left.

## 8. Complexity

Count comparisons of the form `A[i] > key`. In iteration $j$ the inner loop makes at least 1 and at most $j$ of them.

**Best case: already sorted.** Each key is compared once with its left neighbour and stays put.

$$
T_{\text{best}}(n) = \sum_{j=1}^{n-1} 1 = n - 1 = \Theta(n).
$$

**Worst case: strictly decreasing.** Each key is smaller than everything before it and travels to the front.

$$
T_{\text{worst}}(n) = \sum_{j=1}^{n-1} j = \frac{n (n - 1)}{2} = \Theta(n^2).
$$

**In general: inversions.** An *inversion* is a pair of positions $p < q$ with $a_p > a_q$: two elements that are out of order with respect to each other. Each shift on line 5 moves one element past the key and removes exactly one inversion, and nothing else changes the number of inversions. Therefore

$$
\text{number of shifts} = \text{number of inversions in the input.}
$$

A sorted list has none. A strictly decreasing list has one for every pair, $\frac{n(n-1)}{2}$. The number of comparisons is at most the number of inversions plus $n - 1$, which makes "adaptive" precise: insertion sort is fast exactly when the input has few inversions.

```python
def insertion_sort_counted(items: list[int]) -> tuple[int, int]:
    """Sort in place and return (comparisons, shifts)."""
    comparisons = shifts = 0
    for j in range(1, len(items)):
        key = items[j]
        i = j - 1
        while i >= 0:
            comparisons += 1
            if items[i] <= key:
                break
            items[i + 1] = items[i]
            shifts += 1
            i -= 1
        items[i + 1] = key
    return comparisons, shifts


def inversions(items: list[int]) -> int:
    """Count pairs p < q with items[p] > items[q], directly from the definition."""
    n = len(items)
    return sum(1 for p in range(n) for q in range(p + 1, n) if items[p] > items[q])


for n in range(1, 40):
    assert insertion_sort_counted(list(range(n))) == (n - 1, 0)                              # best case
    assert insertion_sort_counted(list(range(n, 0, -1))) == (n * (n - 1) // 2, n * (n - 1) // 2)  # worst case

for values in product(range(4), repeat=6):
    original = list(values)
    comparisons, shifts = insertion_sort_counted(list(values))
    assert shifts == inversions(original)
    assert comparisons <= shifts + len(original) - 1
```

**Space.** One variable for the key and two indices: $\Theta(1)$ extra memory.

| Case | Comparisons | Time |
| --- | --- | --- |
| Best (sorted) | $n - 1$ | $\Theta(n)$ |
| Worst (reversed) | $\frac{n(n-1)}{2}$ | $\Theta(n^2)$ |
| Any input with $I$ inversions | at most $I + n - 1$ | $\Theta(n + I)$ |

## 9. Worked example

Sort $\langle 31, 12, 45, 8 \rangle$. The bar marks the end of the sorted prefix.

| $j$ | $key$ | Before | Shifts | After |
| --- | --- | --- | --- | --- |
| 1 | 12 | $31 \mid 12,\ 45,\ 8$ | 31 moves right | $12,\ 31 \mid 45,\ 8$ |
| 2 | 45 | $12,\ 31 \mid 45,\ 8$ | none | $12,\ 31,\ 45 \mid 8$ |
| 3 | 8 | $12,\ 31,\ 45 \mid 8$ | 45, 31 and 12 move right | $8,\ 12,\ 31,\ 45$ |

Four shifts in total. The input has four inversions: $(31, 12)$, $(31, 8)$, $(12, 8)$ and $(45, 8)$.

```python
example = [31, 12, 45, 8]
assert inversions(example) == 4
assert insertion_sort_counted(example) == (5, 4)
assert example == [8, 12, 31, 45]
```

## 10. Practice

1. Sort $\langle 5, 2, 4, 6, 1, 3 \rangle$ by hand, writing the list after each outer iteration. Count the shifts and confirm the count by listing the inversions.
2. How many comparisons does insertion sort make on a list of $n$ equal elements? Which case is that?
3. A list of length $n$ is sorted except that each element is at most $k$ positions from where it belongs. Give a bound on the running time in terms of $n$ and $k$.
4. Rewrite the algorithm to sort into non-increasing order. Which single character changes, and does the result remain stable?

Then solve **Count the shifts** in the practice problems.

## 11. Assessment

- [ ] State both parts of the output condition of sorting.
- [ ] State the outer-loop invariant and prove its maintenance.
- [ ] Derive the best-case and worst-case comparison counts.
- [ ] Define an inversion and explain why the number of shifts equals the number of inversions.
- [ ] Explain what "stable" means and which line of the code makes insertion sort stable.

## 12. Further study

- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition), sections 2.1 and 2.2, where insertion sort is the first algorithm analysed.
- Skiena, *The Algorithm Design Manual* (3rd edition), chapter 4, on sorting and its applications.
- MIT OpenCourseWare, 6.006 *Introduction to Algorithms* (Spring 2020), Lecture 3: Sets and Sorting.
- Morin, *Open Data Structures*, chapter 11, for the comparison-based sorting algorithms that improve on quadratic time.

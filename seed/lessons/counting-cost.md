## 1. Motivation

Two correct algorithms for the same problem can differ by a factor of a million in the time they take. To choose between them before writing either, we need a way to predict cost from the description of the algorithm alone.

Timing a program with a stopwatch does not do this. The result depends on the machine, the language, what else the computer was doing, and the particular inputs that happened to be tried. We want a statement about the algorithm.

## 2. Intuition

Pick a simple, idealised machine. Agree which of its steps cost one unit. Then count how many steps the algorithm performs, as a function of the **size** of the input.

The count is a function, not a number: "linear search makes at most $n$ comparisons on a list of length $n$". Different inputs of the same size can cost different amounts, so we say which inputs we mean: the worst, the best, or an average.

## 3. Visualization

Run the search below, then edit the target so that it is the first element, the last element, and absent. The step counter is the quantity this lesson is about.

```viz
algorithm: linear-search
input: 6, 11, 4, 9, 15, 2, 8, 13
target: 13
```

## 4. Formal explanation

**The model.** In the *random-access machine* (RAM) model, memory is a sequence of cells each holding one number, and each of the following takes one time unit:

- an arithmetic operation or a comparison on two numbers;
- reading or writing one memory cell, including indexing into an array;
- a jump, a function call or a return.

The numbers are assumed to fit in one cell. That is a simplification: Python integers can grow without bound, and arithmetic on very large integers is not constant time. For the problems in this module the numbers are small and the simplification is harmless. We will return to it when it is not.

**Input size** is a number $n$ that measures how large an instance is. For a list it is usually the number of elements.

**Running time** on a particular instance is the number of unit steps performed. For a fixed size $n$ there are many instances, so we define three functions of $n$.

| Function | Definition |
| --- | --- |
| Worst case $T_{\text{worst}}(n)$ | The maximum running time over all instances of size $n$ |
| Best case $T_{\text{best}}(n)$ | The minimum over all instances of size $n$ |
| Average case $T_{\text{avg}}(n)$ | The expected running time under a stated probability distribution on instances of size $n$ |

Unless we say otherwise, "the running time" means the worst case. It is a guarantee: no input of size $n$ can take longer.

An average case is only meaningful together with its distribution. "On average" with no distribution stated is not a claim that can be checked.

## 5. Pseudocode

To count, annotate each line with its cost and the number of times it runs. Here is linear search for a target that is **absent**, on a list of length $n$.

```text
LINEAR-SEARCH(A, x)                cost   times
1  for i = 0 to n - 1              c1     n + 1
2      if A[i] == x                c2     n
3          return i                c3     0
4  return -1                       c4     1
```

Line 1 runs $n + 1$ times because the loop test is evaluated once more, when it fails. The total is

$$
T(n) = c_1 (n + 1) + c_2 n + c_4 = (c_1 + c_2)\, n + (c_1 + c_4).
$$

The constants depend on the machine. The shape, a constant times $n$ plus a constant, does not.

## 6. Python implementation

Counting by hand is error-prone, so we check it. The function below performs linear search and also reports how many element comparisons it made.

```python
def linear_search_counted(items: list[int], target: int) -> tuple[int, int]:
    """Return (index or -1, number of comparisons with elements of items)."""
    comparisons = 0
    for i in range(len(items)):
        comparisons += 1
        if items[i] == target:
            return i, comparisons
    return -1, comparisons


data = [6, 11, 4, 9, 15, 2, 8, 13]
assert linear_search_counted(data, 6) == (0, 1)     # best case
assert linear_search_counted(data, 13) == (7, 8)    # last element
assert linear_search_counted(data, 99) == (-1, 8)   # absent: worst case
```

We count comparisons rather than every unit step because each iteration performs a bounded number of other steps. The comparison count therefore determines the total up to a constant factor. A step chosen for this purpose is called a **basic operation**.

## 7. Correctness

A cost analysis is a claim like any other and needs an argument. Here it is for the average case of a successful search.

**Claim.** If the target occurs exactly once and is equally likely to be at each of the $n$ positions, the expected number of comparisons is $\dfrac{n + 1}{2}$.

**Proof.** If the target is at index $i$, the search makes $i + 1$ comparisons. Each index has probability $\frac{1}{n}$, so the expectation is

$$
\sum_{i=0}^{n-1} \frac{1}{n}\,(i + 1) = \frac{1}{n} \sum_{k=1}^{n} k = \frac{1}{n} \cdot \frac{n (n + 1)}{2} = \frac{n + 1}{2}. \qquad \blacksquare
$$

The identity $\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$ appears constantly in this course. If it is not familiar, prove it by induction before moving on.

```python
def average_comparisons(n: int) -> float:
    """Average comparisons over the n possible positions of a target that is present."""
    items = list(range(n))
    total = sum(linear_search_counted(items, target)[1] for target in items)
    return total / n


for n in (1, 2, 5, 10, 100):
    assert average_comparisons(n) == (n + 1) / 2
```

## 8. Complexity

Comparisons made by linear search on a list of length $n \ge 1$:

| Case | Input | Comparisons |
| --- | --- | --- |
| Best | Target is the first element | $1$ |
| Worst | Target is last or absent | $n$ |
| Average, successful | Target uniformly distributed over the positions | $\frac{n+1}{2}$ |

**Space** is counted the same way: the number of memory cells used *in addition to the input*. Linear search uses one index and one counter, a constant amount.

## 9. Worked example

Finding the maximum of a non-empty list.

```python
def maximum(items: list[int]) -> tuple[int, int]:
    """Return (largest element, number of comparisons between elements)."""
    best = items[0]
    comparisons = 0
    for i in range(1, len(items)):
        comparisons += 1
        if items[i] > best:
            best = items[i]
    return best, comparisons


assert maximum([4, 9, 2, 9, 1]) == (9, 4)
assert maximum([5]) == (5, 0)
assert maximum([3, 2, 1]) == (3, 2)
assert maximum([1, 2, 3]) == (3, 2)
```

The loop body runs for $i = 1, \dots, n-1$ and makes one comparison each time, so the count is exactly $n - 1$ for **every** input of size $n$. Best, worst and average cases coincide. Compare this with linear search, where they differ by a factor of $n$.

Can any algorithm do better? No. Every element except the maximum must lose at least one comparison, otherwise it could have been the maximum and the algorithm could not have known. That requires at least $n - 1$ comparisons. An argument of this kind, about every possible algorithm for a problem, is called a **lower bound**.

## 10. Practice

1. Annotate the pseudocode of section 5 for the case where the target is found at index $k$. How many times does each line run?
2. Under the distribution "the target is present with probability $p$, and if present is equally likely to be at each position", show that the expected number of comparisons is $p\,\frac{n+1}{2} + (1 - p)\,n$. Check that the formula gives the right values at $p = 0$ and $p = 1$.
3. An algorithm examines every pair of positions $(i, j)$ with $i < j$ exactly once. How many pairs are there in a list of length $n$? Give an exact formula.

## 11. Assessment

- [ ] State what costs one unit in the RAM model.
- [ ] Define worst, best and average case, and say what extra information an average case needs.
- [ ] Derive the comparison counts for linear search in all three cases.
- [ ] Explain why finding a maximum needs at least $n - 1$ comparisons.

## 12. Further study

- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition), section 2.2, on analysing algorithms in the RAM model.
- Kleinberg and Tardos, *Algorithm Design* (Addison-Wesley, 2005), chapter 2, on what it means for an algorithm to be efficient.
- Morin, *Open Data Structures*, chapter 1, for the word-RAM model used throughout that book. Freely available at opendatastructures.org.

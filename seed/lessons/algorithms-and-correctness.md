## 1. Motivation

A program that produces the right answer on the three inputs you tried is not yet an algorithm you can trust. The inputs you did not try are the ones that matter: the empty list, the list with one element, the value that sits in the very last position.

This course is about methods that are right for **every** valid input, and about arguments that let you know so without testing them all. We start with the simplest problem that still shows the whole method: looking for a value in a list.

## 2. Intuition

Three ideas, which we will keep separate for the rest of the course.

- A **problem** is a precise statement of what is given and what is wanted. It says nothing about how.
- An **instance** is one particular input to the problem.
- An **algorithm** is a finite, unambiguous procedure that, for every instance, stops and produces a correct output.

"Look for a number in a list" is not yet a problem. "Given a list $A$ of $n$ integers and an integer $x$, return an index $i$ with $A[i] = x$, or report that no such index exists" is.

The natural method is the one you would use to find a name on an unsorted sheet of paper: start at the top and read down until you find it or run out of sheet.

## 3. Visualization

Step through the search. Change the target to a value that is absent, then to the first element, and watch how many steps each takes.

```viz
algorithm: linear-search
input: 14, 3, 27, 8, 19, 5, 22
target: 19
```

## 4. Formal explanation

**The search problem.**

- *Input:* a sequence $A = \langle a_0, a_1, \dots, a_{n-1} \rangle$ of $n \ge 0$ integers, and an integer $x$.
- *Output:* an index $i$ with $0 \le i < n$ and $a_i = x$, or the special value $-1$ if $x$ does not occur in $A$.

An algorithm is **correct** for this problem if, for every instance, it terminates and its output satisfies the output condition. Two things have to be shown: it stops, and what it returns is right. They are proved separately.

The tool for reasoning about a loop is a **loop invariant**: a statement about the program's variables that is true every time control reaches the top of the loop. An invariant is useful when it has three properties.

| Property | What you show |
| --- | --- |
| Initialisation | It holds before the first iteration |
| Maintenance | If it holds before an iteration, it holds before the next one |
| Usefulness at exit | Together with the reason the loop stopped, it implies the result |

This is mathematical induction applied to the number of iterations: initialisation is the base case and maintenance is the inductive step.

## 5. Pseudocode

```text
LINEAR-SEARCH(A, x)
1  for i = 0 to n - 1
2      if A[i] == x
3          return i
4  return -1
```

## 6. Python implementation

```python
def linear_search(items: list[int], target: int) -> int:
    """Return the first index i with items[i] == target, or -1 if there is none."""
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1


assert linear_search([14, 3, 27, 8, 19, 5, 22], 19) == 4
assert linear_search([14, 3, 27, 8, 19, 5, 22], 6) == -1
assert linear_search([], 1) == -1            # no elements at all
assert linear_search([7], 7) == 0            # a single element
assert linear_search([2, 9, 2], 2) == 0      # the first of several matches
```

The tests at the bottom are chosen on purpose: the typical case, the absent value, the empty input, the smallest non-empty input, and duplicates. Boundary cases like these are where most incorrect programs fail.

## 7. Correctness

**Invariant.** At the start of each iteration with index $i$, the value $x$ does not occur among $a_0, \dots, a_{i-1}$.

- **Initialisation.** Before the first iteration $i = 0$, and the range $a_0, \dots, a_{-1}$ is empty. The statement is true of an empty range.
- **Maintenance.** Suppose the invariant holds at the start of iteration $i$. If $a_i = x$ the function returns and there is no next iteration. Otherwise $a_i \ne x$, so $x$ does not occur among $a_0, \dots, a_i$, which is the invariant for $i + 1$.
- **Exit.** The function returns in one of two places. At line 3 it returns $i$ with $a_i = x$, which satisfies the output condition. At line 4 the loop has finished, so the invariant holds for $i = n$: the value $x$ does not occur among $a_0, \dots, a_{n-1}$, and $-1$ is the correct answer.

**Termination.** The loop runs at most $n$ times, because $i$ takes each value in $0, \dots, n-1$ at most once.

The invariant also gives something extra for free. When line 3 returns $i$, the value $x$ is not among the earlier elements, so $i$ is the **first** index where $x$ occurs.

## 8. Complexity

Count comparisons between $x$ and an element of $A$.

| Case | When | Comparisons |
| --- | --- | --- |
| Best | $x$ is the first element | $1$ |
| Worst | $x$ is last, or absent | $n$ |

The memory used besides the input is a single index, whatever the size of $n$. The next lesson makes "count the comparisons" precise, and the one after gives a notation for results like "proportional to $n$".

## 9. Worked example

Search for $x = 8$ in $A = \langle 14, 3, 27, 8, 19 \rangle$.

| $i$ | $a_i$ | $a_i = 8$? | What the invariant says before this step |
| --- | --- | --- | --- |
| 0 | 14 | no | nothing has been examined |
| 1 | 3 | no | 8 is not among $\langle 14 \rangle$ |
| 2 | 27 | no | 8 is not among $\langle 14, 3 \rangle$ |
| 3 | 8 | yes, return 3 | 8 is not among $\langle 14, 3, 27 \rangle$ |

Four comparisons, and the returned index is the first position holding 8.

## 10. Practice

1. Write the problem statement, in the input and output style of section 4, for "find the largest element of a list". What should the output be for an empty list? There is more than one defensible answer: choose one and state it.
2. The function below is meant to return the index of the **last** occurrence of the target. State a loop invariant for it and use it to argue correctness.

   ```python
   def last_occurrence(items: list[int], target: int) -> int:
       found = -1
       for i in range(len(items)):
           if items[i] == target:
               found = i
       return found


   assert last_occurrence([2, 9, 2, 4], 2) == 2
   assert last_occurrence([2, 9, 2, 4], 5) == -1
   ```

3. A classmate proposes the invariant "$i \ge 0$" for linear search. It is true at every iteration. Why is it useless?

Then solve **First occurrence** and **Is it sorted?** in the practice problems for this module.

## 11. Assessment

You should now be able to do each of the following without notes.

- [ ] Distinguish a problem, an instance and an algorithm.
- [ ] State the search problem with its input and output conditions.
- [ ] State a loop invariant for linear search and prove its three properties.
- [ ] Explain why termination needs its own argument.

These points are examined in the module quiz.

## 12. Further study

- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition, MIT Press, 2022), chapter 1 and section 2.1, where loop invariants are introduced with insertion sort.
- Skiena, *The Algorithm Design Manual* (3rd edition, Springer, 2020), chapter 1, on the difference between an algorithm that seems to work and one that is correct.
- MIT OpenCourseWare, 6.006 *Introduction to Algorithms* (Spring 2020), Lecture 1: Algorithms and Computation.

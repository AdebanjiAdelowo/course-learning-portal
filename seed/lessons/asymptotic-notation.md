## 1. Motivation

In the last lesson the running time of linear search came out as $(c_1 + c_2)\,n + (c_1 + c_4)$, with constants that depend on the machine. We would like to say what matters about that expression, "it grows in proportion to $n$", and discard what does not, without being vague.

Asymptotic notation is the precise way to do this. It is also the most misused notation in the subject, so we will go slowly and prove things.

## 2. Intuition

Compare two algorithms on an input of size $n$. One takes $100\,n$ steps and the other $n^2$.

| $n$ | $100\,n$ | $n^2$ |
| --- | --- | --- |
| 10 | 1 000 | 100 |
| 100 | 10 000 | 10 000 |
| 1 000 | 100 000 | 1 000 000 |
| 1 000 000 | $10^{8}$ | $10^{12}$ |

For small inputs the "worse" algorithm wins. Beyond $n = 100$ it loses, and the gap keeps widening without limit. No change of constant can rescue $n^2$: replacing $100$ by a million only moves the crossover point.

So we compare functions by their **growth rate**: how they behave for large $n$, ignoring constant factors. That is what $O$, $\Omega$ and $\Theta$ formalise.

## 3. Visualization

The plot shows the common growth rates on a logarithmic vertical axis. Read it by picking a value of $n$ and comparing heights: each curve eventually sits above all those listed before it.

![Growth of common functions on a logarithmic scale](/figures/growth-rates.svg "Values of log n, n, n log n, n squared and 2 to the n for n from 1 to 64. The vertical axis is logarithmic.")

## 4. Formal explanation

Let $f$ and $g$ be functions from the positive integers to the non-negative reals.

**Upper bound.** $f(n) = O(g(n))$ if there are constants $c > 0$ and $n_0 \ge 1$ such that

$$
f(n) \le c \cdot g(n) \quad \text{for all } n \ge n_0 .
$$

**Lower bound.** $f(n) = \Omega(g(n))$ if there are constants $c > 0$ and $n_0 \ge 1$ such that

$$
f(n) \ge c \cdot g(n) \quad \text{for all } n \ge n_0 .
$$

**Tight bound.** $f(n) = \Theta(g(n))$ if both hold: $f(n) = O(g(n))$ and $f(n) = \Omega(g(n))$.

The pair $(c, n_0)$ is called a **witness**. To prove an $O$ statement you exhibit one. To disprove it you show that no pair can work.

Three points that prevent most errors.

1. The "$=$" is a historical abuse of notation. $O(g)$ is a *set* of functions and $f = O(g)$ means $f \in O(g)$. It is not symmetric: never write $O(g) = f$.
2. $O$ is an upper bound, not a description. The statement $n = O(n^2)$ is **true**. It is just not the strongest thing one can say.
3. The notation describes functions, not cases. "Worst case" and "$O$" are independent ideas. It is correct to say that the best case of linear search is $\Theta(1)$ and its worst case is $\Theta(n)$.

## 5. Pseudocode

Proving $f(n) = O(g(n))$ from the definition follows a fixed routine.

```text
PROVE-BIG-O(f, g)
1  write f(n) as a sum of terms
2  bound each term above by a multiple of g(n), noting the n for which the bound holds
3  add the multiples to obtain c
4  take n0 to be the largest threshold used in step 2
5  conclude f(n) <= c * g(n) for all n >= n0
```

## 6. Python implementation

A witness can be tested numerically. This does not replace the proof, since a finite check says nothing about all $n$, but it catches arithmetic slips quickly.

```python
from collections.abc import Callable


def witness_holds(
    f: Callable[[int], float],
    g: Callable[[int], float],
    c: float,
    n0: int,
    upto: int = 10_000,
) -> bool:
    """Check f(n) <= c * g(n) for every integer n with n0 <= n <= upto."""
    return all(f(n) <= c * g(n) for n in range(n0, upto + 1))


def f(n: int) -> float:
    return 3 * n * n + 10 * n + 5


def square(n: int) -> float:
    return n * n


assert witness_holds(f, square, c=18, n0=1)       # the witness proved in section 7
assert witness_holds(f, square, c=4, n0=11)       # a different, equally valid witness
assert not witness_holds(f, square, c=3, n0=1)    # c = 3 can never work: f(n) > 3 n^2 for all n
```

## 7. Correctness

**Claim 1.** $3n^2 + 10n + 5 = O(n^2)$.

**Proof.** For $n \ge 1$ we have $n \le n^2$ and $1 \le n^2$. Therefore

$$
3n^2 + 10n + 5 \le 3n^2 + 10n^2 + 5n^2 = 18\,n^2 .
$$

The witness is $c = 18$, $n_0 = 1$. $\blacksquare$

**Claim 2.** $3n^2 + 10n + 5 = \Omega(n^2)$, and hence $\Theta(n^2)$.

**Proof.** All three terms are non-negative, so $3n^2 + 10n + 5 \ge 3n^2$ for all $n \ge 1$. The witness is $c = 3$, $n_0 = 1$. $\blacksquare$

**Claim 3.** $n^2 \ne O(n)$.

**Proof.** Suppose, for contradiction, that $n^2 \le c\,n$ for all $n \ge n_0$. Dividing by $n$ gives $n \le c$ for all $n \ge n_0$. This fails for $n = \max(n_0, \lceil c \rceil + 1)$. So no witness exists. $\blacksquare$

The third proof is the pattern for every negative result: assume a witness, and produce an $n$ beyond its threshold that violates the inequality.

**A useful shortcut.** When the limit exists,

$$
\lim_{n \to \infty} \frac{f(n)}{g(n)} =
\begin{cases}
0 & \Rightarrow\ f = O(g) \text{ but } f \ne \Omega(g) \\
L \text{ with } 0 < L < \infty & \Rightarrow\ f = \Theta(g) \\
\infty & \Rightarrow\ f = \Omega(g) \text{ but } f \ne O(g)
\end{cases}
$$

## 8. Complexity

The growth rates met most often, from slowest to fastest. The last column shows roughly the largest input that takes about a second at $10^8$ simple steps per second.

| Class | Name | Typical source | $n$ for about one second |
| --- | --- | --- | --- |
| $\Theta(1)$ | constant | indexing an array | any |
| $\Theta(\log n)$ | logarithmic | halving the search range | astronomically large |
| $\Theta(n)$ | linear | one pass over the input | $10^8$ |
| $\Theta(n \log n)$ | linearithmic | efficient sorting | several million |
| $\Theta(n^2)$ | quadratic | all pairs | $10^4$ |
| $\Theta(n^3)$ | cubic | all triples | a few hundred |
| $\Theta(2^n)$ | exponential | all subsets | about 26 |

Two facts are used constantly.

- **Polynomials.** A polynomial of degree $d$ with positive leading coefficient is $\Theta(n^d)$. Only the highest power matters.
- **Logarithm bases.** $\log_a n = \dfrac{\log_b n}{\log_b a}$, so logarithms to different bases differ by a constant factor. Inside $O$, $\Omega$ and $\Theta$ the base can be omitted. In this course $\log n$ means $\log_2 n$ unless stated otherwise.

## 9. Worked example

Simplify $T(n) = 4 n \log_2 n + 20 n + 300$.

For $n \ge 2$ we have $\log_2 n \ge 1$, so $n \le n \log_2 n$ and $1 \le n \log_2 n$. Then

$$
T(n) \le 4 n \log_2 n + 20\, n \log_2 n + 300\, n \log_2 n = 324\, n \log_2 n ,
$$

which gives $T(n) = O(n \log n)$ with witness $c = 324$, $n_0 = 2$. Since also $T(n) \ge 4 n \log_2 n$, we get $T(n) = \Theta(n \log n)$.

```python
import math


def t(n: int) -> float:
    return 4 * n * math.log2(n) + 20 * n + 300


def n_log_n(n: int) -> float:
    return n * math.log2(n)


assert witness_holds(t, n_log_n, c=324, n0=2)
assert all(t(n) >= 4 * n_log_n(n) for n in range(2, 10_001))
```

Notice what the witness $c = 324$ tells you in practice: the "lower-order" terms are not negligible for small $n$. Asymptotic statements are about large inputs.

## 10. Practice

1. Prove from the definition that $5n + 12 = O(n)$. Give your witness.
2. Prove that $n^3 \ne O(n^2)$.
3. True or false, with a one-line justification each:
   - $2^{n+1} = O(2^n)$
   - $2^{2n} = O(2^n)$
   - $\log_2 (n^2) = \Theta(\log_2 n)$
4. Order by growth rate, slowest first: $n \log n$, $\ 2^n$, $\ \sqrt{n}$, $\ n^2$, $\ \log n$, $\ n$.

## 11. Assessment

- [ ] State the definitions of $O$, $\Omega$ and $\Theta$ with their quantifiers.
- [ ] Prove a polynomial bound by exhibiting a witness.
- [ ] Prove a negative result by contradiction.
- [ ] Explain why "the worst case is $O(n)$" and "the algorithm is $O(n)$" are different kinds of statement.

## 12. Further study

- Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms* (4th edition), chapter 3, which also defines the strict versions $o$ and $\omega$.
- Kleinberg and Tardos, *Algorithm Design*, sections 2.2 and 2.4, for asymptotic order of growth and a survey of common running times.
- Skiena, *The Algorithm Design Manual* (3rd edition), chapter 2, for the practical meaning of each growth rate.

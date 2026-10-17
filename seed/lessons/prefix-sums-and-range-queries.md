## Learning objectives and prerequisites

Build a prefix-sum array, answer half-open range queries, prove boundary behavior and use a difference array for batched range additions. Prerequisites: array loops, indices and integer sums. We distinguish static-query preprocessing from data structures for online updates, which come later in the course.

## Prefix definition and query contract

For an array $A$ of length $n$, define $P[0]=0$ and $P[i+1]=P[i]+A[i]$. Then $P[k]$ is the sum of the first $k$ elements and $P$ has $n+1$ entries. The extra zero simplifies empty ranges and ranges beginning at zero.

A query $(l,r)$ denotes the half-open range $A[l:r]$ with $0\le l\le r\le n$. Its sum is $P[r]-P[l]$: the prefix through $r$ includes both the unwanted first $l$ values and the desired suffix, and subtraction cancels the former. A closed interval $[l,r]$ would instead use $P[r+1]-P[l]$. State the convention rather than guessing it.

## Algorithm and Python

```text
PREFIX(A)
    P[0] = 0
    for i = 0 to n-1: P[i+1] = P[i] + A[i]
RANGE(P, l, r)
    require 0 <= l <= r <= n
    return P[r] - P[l]
```

```python-run
def prefix_sums(items):
    prefix = [0]
    for value in items:
        prefix.append(prefix[-1] + value)
    return prefix

items = [3, -2, 5, 1]
prefix = prefix_sums(items)
assert prefix == [0, 3, 1, 6, 7]
assert prefix[3] - prefix[1] == 3
assert prefix[2] - prefix[2] == 0
assert prefix_sums([]) == [0]
print(prefix, 'sum [1,3):', prefix[3] - prefix[1])
```

The range $[1,3)$ contains -2 and5, totaling3. Empty range $[2,2)$ subtracts a prefix from itself. Negative values do not invalidate subtraction. Prefix sums do not generally support range minimum by subtraction: minimum lacks the inverse operation used here.

## Correctness and complexity

The construction invariant is that every stored prefix equals its corresponding original partial sum. Induct on $k$: $P[0]$ equals the empty sum. If $P[k]$ equals the sum of $A[0:k]$, adding $A[k]$ gives the sum of $A[0:k+1]$. Thus every prefix is correct. Subtraction then proves the query formula. The construction performs $n$ bounded iterations and terminates.

Preprocessing costs $\Theta(n)$ arithmetic operations and $\Theta(n)$ auxiliary space. Each query needs two reads and one subtraction, hence $\Theta(1)$ unit-cost work. For $q$ queries, total work is $\Theta(n+q)$ rather than $\Theta(nq)$ in the worst case of separately summing every range. With arbitrary-size Python integers, add operand bit-length costs when they matter.

## Difference arrays for batched updates

Suppose many updates add $value$ to every index in $[l,r)$. Mark the change at $l$ by adding $value$ to $D[l]$, and cancel it at $r$ by subtracting $value$ from $D[r]$. Allocate $n+1$ difference entries so $r=n$ is valid. After all updates, a running prefix of $D$ gives the increment for each index.

```python

def range_additions(length, updates):
    difference = [0] * (length + 1)
    for left, right, value in updates:
        if not 0 <= left <= right <= length:
            raise ValueError('invalid half-open range')
        difference[left] += value
        difference[right] -= value
    answer = []
    running = 0
    for i in range(length):
        running += difference[i]
        answer.append(running)
    return answer

assert range_additions(4, [[0, 3, 2], [1, 4, -1]]) == [2, 1, 1, -1]
assert range_additions(0, [[0, 0, 5]]) == []
```

For one update, its contribution is zero before $l$, $value$ from $l$ through $r-1$, and zero from $r$ onward. Summing contributions proves overlapping updates correct. Updates cost $\Theta(u)$ total markers and materialization costs $\Theta(n)$, with $\Theta(n)$ space.

## Boundaries, mistakes and exercises

Do not confuse prefix indices with element indices: prefix index $n$ is valid. Do not omit the cancellation marker when a range ends at $n$. Empty updates cancel at the same index. Changes to $A$ after prefix construction make the old prefixes stale; rebuilding after each update loses the query advantage.

Trace $[0,4)$ and $[3,4)$ for the example. Derive the difference array for adding3 to $[1,3)$ and -2 to $[2,4)$. Explain why a difference array is useful for batched updates but does not immediately provide constant-time intermediate range-sum queries. Write tests for empty arrays, full ranges, singleton ranges, negative updates and overlapping intervals.

## Summary and further study

Prefix sums trade preprocessing and space for cheap static sum queries. Differences trade deferred materialization for cheap range-update markers. Their similar prefix operation solves different contracts. Practice the range-sum and batched-range-addition problems before moving to online query structures in later phases.

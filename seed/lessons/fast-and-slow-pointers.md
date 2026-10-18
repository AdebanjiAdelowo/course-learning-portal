## Learning objectives

Use two pointers that move in the same direction at different speeds to detect a cycle in an iterated function, locate where the cycle starts, and find a repeated value in a list using constant extra space. Prove why the pointers meet and bound the number of steps. Prerequisites: the Linked Lists module, which introduced fast and slow pointers for midpoints and cycles in linked nodes.

## From linked nodes to functions

In the Linked Lists module, `slow` moved one node per step and `fast` moved two, which finds a midpoint or detects a cycle in a chain of nodes. The same idea works for any sequence defined by repeatedly applying a function: $x_0$, $x_1 = f(x_0)$, $x_2 = f(x_1)$, and so on. If $f$ maps a finite set to itself, the sequence must eventually repeat a value, and from then on it cycles forever. The sequence looks like the Greek letter rho: a tail of length $\mu$ leading into a cycle of length $\lambda$.

Storing every value seen in a set detects the repeat, but uses space proportional to $\mu + \lambda$. Two pointers at different speeds detect it with constant space.

## Floyd's two phases

**Phase 1, meeting.** Start both pointers at $x_0$. Move `slow` one step and `fast` two steps until they hold the same value. **Phase 2, the cycle start.** Move one pointer back to $x_0$ and leave the other at the meeting point. Move both one step at a time; they meet exactly at $x_\mu$, the first value of the cycle.

```python-run
def cycle_start(f, x0):
    """Return (mu, lam): tail length and cycle length of x0, f(x0), f(f(x0)), ..."""
    slow, fast = f(x0), f(f(x0))
    while slow != fast:
        slow, fast = f(slow), f(f(fast))
    mu, slow = 0, x0
    while slow != fast:
        slow, fast = f(slow), f(fast)
        mu += 1
    lam, fast = 1, f(slow)
    while slow != fast:
        fast = f(fast)
        lam += 1
    return mu, lam

def cycle_start_with_set(f, x0):
    seen, x, i = {}, x0, 0
    while x not in seen:
        seen[x] = i
        x, i = f(x), i + 1
    return seen[x], i - seen[x]

step = lambda x: (x * x + 1) % 255
assert cycle_start(step, 3) == cycle_start_with_set(step, 3)
for modulus in (7, 10, 31, 100):
    g = lambda x, m=modulus: (x * x + 1) % m
    for start in range(modulus):
        assert cycle_start(g, start) == cycle_start_with_set(g, start)
print("tail and cycle lengths for x*x + 1 mod 255 from 3:", cycle_start(step, 3))
```

## Worked example

Let $f(x) = (x^2 + 1) \bmod 10$ and $x_0 = 0$. The sequence is 0, 1, 2, 5, 6, 7, 0, 1, ... so the tail is empty, $\mu = 0$, and the cycle 0, 1, 2, 5, 6, 7 has length $\lambda = 6$. Phase 1: slow visits 1, 2, 5, 6, 7, 0 while fast visits 2, 6, 0, 2, 6, 0; they first agree at 0 after six steps. Phase 2 restarts slow at $x_0 = 0$, which already equals fast, so $\mu = 0$. Walking fast around the cycle once counts $\lambda = 6$.

## Finding a repeated value in a list

Suppose a list of length $n + 1$ holds values from 1 to $n$. At least one value repeats, by the pigeonhole principle. Read the list as a function: $f(i) = A[i]$. Position 0 is never a value, so the sequence starting at index 0 enters a cycle, and the cycle's entry point is a value that two different positions point to: a repeated value. Floyd's method finds it without modifying the list and with constant extra space.

```python-run
def repeated_value(values):
    slow = fast = 0
    while True:
        slow, fast = values[slow], values[values[fast]]
        if slow == fast:
            break
    slow = 0
    while slow != fast:
        slow, fast = values[slow], values[fast]
    return slow

assert repeated_value([1, 3, 4, 2, 2]) == 2
assert repeated_value([3, 1, 3, 4, 2]) == 3
assert repeated_value([1, 1]) == 1
assert repeated_value([2, 2, 2, 2, 2]) == 2
```

When several values repeat, this method returns the one at the cycle entry, which need not be the smallest repeated value. A problem contract must say which repeated value is wanted.

## Correctness

Phase 1 keeps the invariant that after $t$ iterations slow is at $x_t$ and fast is at $x_{2t}$. Phase 2 keeps the invariant that both pointers have taken the same number of steps since its start, so their positions differ by exactly $t$ indices along the sequence.

Phase 1 terminates once both pointers are on the cycle: measure the distance from fast forwards around the cycle to slow. Each iteration moves slow one step and fast two, so fast gains one step on slow and that distance decreases by exactly one. It starts below $\lambda$, so it reaches zero within $\lambda$ steps. Suppose they meet after $t$ steps, with slow at $x_t$ and fast at $x_{2t}$. Both are on the cycle and equal, so $2t - t = t$ is a multiple of $\lambda$. Now a pointer that starts at $x_0$ and one that starts at $x_t$ move together. After $\mu$ steps the first is at $x_\mu$ and the second is at $x_{t + \mu}$. Since $t$ is a multiple of $\lambda$ and $\mu$ is on the cycle, $x_{t + \mu} = x_\mu$. They cannot meet earlier, because before step $\mu$ the first pointer is still on the tail and the second is on the cycle.

## Complexity

Phase 1 takes at most $\mu + \lambda$ iterations: slow needs $\mu$ steps to reach the cycle, then at most $\lambda$ more. Phase 2 takes $\mu$ iterations and measuring the cycle takes $\lambda$. Each iteration calls $f$ at most three times, so the total is $O(\mu + \lambda)$ evaluations of $f$ with $O(1)$ extra space. The set-based method uses the same time but $\Theta(\mu + \lambda)$ space. For the repeated-value problem, $\mu + \lambda \le n + 1$, so the method is linear.

## Common mistakes

- Starting slow and fast at different positions and then using the phase 2 argument, which assumed both started at $x_0$.
- Moving fast with `f(fast)` only, which never closes the gap.
- Applying the repeated-value method when the values can be 0 or larger than $n$, so a value is not a valid next index.
- Claiming the method returns the smallest repeat, or any particular repeat, without a contract that says so.

## Practice exercises

1. Compute $\mu$ and $\lambda$ for $f(x) = (2x + 3) \bmod 11$ from $x_0 = 1$ by hand, then check with `cycle_start`.
2. Explain why the repeated-value method must start at index 0 and not at index 1.
3. Modify `cycle_start` to count how many times $f$ is evaluated, and check the bound $3(\mu + \lambda)$ on several inputs.
4. A sequence of digit-square sums either reaches 1 or cycles. Use fast and slow pointers to decide which happens for a given start, without a set.

The next lesson returns to opposite-direction pointers and builds harder searches: triplets and optimisation problems.

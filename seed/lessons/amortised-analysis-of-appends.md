## Learning objectives and prerequisites

Prove an aggregate bound for doubling, derive an accounting interpretation, and use a potential function without confusing amortized cost with probability. Prerequisites: geometric series, asymptotic bounds and the dynamic-array invariant. We count one unit per copied reference and one unit per appended value write.

## A sequence, not an average input

Amortized analysis bounds total cost for a sequence of operations on a changing structure. It does not assume random inputs. An adversary can choose every appended value and the same bound holds in this model because growth depends on size, not values. An expensive operation borrows its explanation from nearby cheap operations; its actual latency remains expensive.

## Aggregate method

With initial capacity one, copied block sizes are $1,2,4,\ldots,2^k$. For $m>1$ appends, the largest copied block is smaller than $m$, and the geometric sum is less than $2m$. The $m$ new-element writes add $m$, giving total cost less than $3m$. Thus the amortized slot cost is $O(1)$ per append, despite a $\Theta(n)$ worst-case append.

For $m=9$, resize copies total $1+2+4+8=15$. Adding9 new writes gives24 slot units. The bound $3m=27$ holds. Do not sum “worst case $n$” independently for every append: most appends do not resize.

If capacity instead increased by one each time it filled, copied sizes would be $1,2,\ldots,m-1$, totaling $m(m-1)/2$. That policy produces quadratic total work. A geometric factor greater than one trades spare space for fewer copying events.

## Accounting method

Charge each append a small constant budget. Some units pay its immediate write and the remaining credits pay future copies. The credit interpretation is bookkeeping; it need not exist as mutable fields in the implementation. To make a rigorous budget argument, show that credits never go negative. The potential method below supplies this proof without informal claims that every element is copied only once. An early element may be copied many times.

## Potential method

Use $\Phi(n,c)=2n-c$ after nonempty append states in the doubling model. Initially $n=0,c=1$ gives $\Phi=-1$; adding one yields a nonnegative initial-normalized potential and leaves every potential difference unchanged. After the first append the potential is1.

For a non-resizing append, actual cost is1 and potential change is2, so amortized cost $\hat a=1+2=3$. When $n=c$ before growth, actual cost $c+1$. The old potential is $c$; after growth and append it is $2(c+1)-2c=2$. The potential change $2-c$ makes amortized cost $(c+1)+(2-c)=3$ again. Summing telescopes: total actual cost equals total amortized cost plus initial potential minus final potential, which is bounded above by a constant plus $3m$ because normalized final potential is nonnegative.

This potential is designed for append-only doubling. Deletions, shrinking or a different growth factor require a new analysis; do not reuse it blindly.

## Executable cost experiment

```python-run
def append_costs(count):
    size, capacity = 0, 1
    actual = []
    amortised = []
    for _ in range(count):
        before = 2 * size - capacity
        cost = 1
        if size == capacity:
            cost += size
            capacity *= 2
        size += 1
        after = 2 * size - capacity
        actual.append(cost)
        amortised.append(cost + after - before)
    return actual, amortised

actual, charged = append_costs(9)
assert sum(actual) == 24
assert charged == [3] * 9
assert append_costs(0) == ([], [])
print('actual:', actual, 'amortised:', charged)
```

## Correctness of the analysis and cost boundaries

The experiment follows the model's exact state transition, and the algebra above applies to both possible branches. It corroborates the example rather than proving every input length. The proof uses the invariant that append-only states have capacity less than twice size after the first append, guaranteeing the potential lower bound.

Buffer initialization may cost proportional to new capacity. Including those costs changes constants, not the linear aggregate bound. Arbitrary user callbacks, expensive object construction, or unbounded integer arithmetic require separate cost terms. Amortized constant slot work is not a promise of constant wall-clock execution time.

## Common mistakes and exercises

Worst-case, expected and amortized bounds answer different questions. An expensive fifth append is compatible with constant amortized cost. Credits cannot become arbitrarily negative in a valid upper-bound argument. Explain why shrinking immediately whenever one spare slot appears can cause repeated grow/shrink copying under alternating operations. A practical shrinking policy leaves a gap between grow and shrink thresholds to avoid this oscillation.

Compute total slot cost for $m=5$ (12) and $m=8$ (15). Derive the potential change for an append from $n=6,c=8$ (2). Explain why a front insertion still has linear shifting cost even when resizing has constant amortized cost.

## Summary and further study

Aggregate analysis bounds a geometric sum. Accounting distributes a constant budget. Potential stores that budget in a state function and telescopes over operations. Study the dynamic-array laboratory project to compare doubling with unit growth; report operation counts separately from noisy timing measurements.

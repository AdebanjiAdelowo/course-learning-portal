## Approach and correctness

A write index marks where the next nonzero value belongs; a read index scans every position once. Invariant: `values[0:write]` holds the nonzero values of the processed prefix in order, and `values[write:read]` holds only zeros. When `values[read]` is nonzero, swapping it with `values[write]` moves it to the end of the nonzero block and moves a zero (or itself, when `write == read`) into the zero block. When `values[read]` is zero, reading it simply extends the zero block. At the end the whole list is nonzeros followed by zeros.

## Complexity

One pass with at most one swap per position: Theta(n) time and O(1) auxiliary space. Each nonzero value moves only leftwards past zeros, never past another nonzero value, so relative order is stable.

## Boundaries

Empty lists, lists without zeros (every swap is with itself), lists of only zeros, and negative values all follow the same loop. Compare with `!= 0`, not with truthiness of something other than integers, under this integer contract.

## Reference implementation

```python
def zeros_to_end(values):
    write = 0
    for read in range(len(values)):
        if values[read] != 0:
            values[write], values[read] = values[read], values[write]
            write += 1
    return values

assert zeros_to_end([0, 3, 0, 5, 7]) == [3, 5, 7, 0, 0]
assert zeros_to_end([0, 0]) == [0, 0]
```

## Self-review

Browser results are local feedback, not official grading. Explain your invariant and termination argument in your own words before comparing with this editorial.

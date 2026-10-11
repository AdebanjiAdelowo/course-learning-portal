## 1. Motivation

"Have I seen this value before?" and "How many times does each value occur?" are two of the most common questions inside an algorithm. With a list, each question means scanning, which is linear. With a set or a dictionary, each is answered in constant time on average. Replacing a list by a set is very often the whole difference between a quadratic algorithm and a linear one.

## 2. Prerequisites

Lesson 1 of this module: lists, tuples and the cost of `x in items` for a list.

## 3. The idea

A **set** is an unordered collection of distinct values. It answers one question quickly: is this value in the collection?

A **dictionary** maps **keys** to **values**. Given a key, it returns the associated value quickly. A set is, in effect, a dictionary that stores only keys.

Both are built on a **hash table**. To store a key, Python computes a number from it, its *hash*, and uses that number to choose a slot in an array. To look the key up later, it computes the same number and goes straight to that slot. No scanning is involved, which is why the cost does not grow with the size of the collection. How hash tables handle two keys landing in the same slot, and why the cost is constant only *on average*, is the subject of the hash tables module.

Two rules follow directly from that design.

- **Keys must be hashable**, which in practice means immutable: numbers, strings and tuples of those. A list cannot be a key, because if it changed, its hash would change and it could no longer be found.
- **Keys are unique.** Storing a key a second time replaces its value.

## 4. Syntax and semantics

**Sets.**

```python
seen = {3, 1, 4}
seen.add(1)                   # already present: nothing changes
seen.add(5)
assert seen == {1, 3, 4, 5}
assert 4 in seen and 9 not in seen
assert len(seen) == 4

empty = set()                 # {} is an empty DICTIONARY, not an empty set
assert len(empty) == 0

assert set([2, 7, 2, 2, 7]) == {2, 7}             # duplicates disappear
assert {1, 2, 3} | {3, 4} == {1, 2, 3, 4}         # union
assert {1, 2, 3} & {3, 4} == {3}                  # intersection
assert {1, 2, 3} - {3, 4} == {1, 2}               # difference
```

A set has no positions: `seen[0]` is an error, and you should not rely on the order in which a loop visits its elements.

**Dictionaries.**

```python
ages = {"Ada": 36, "Alan": 41}

assert ages["Ada"] == 36                  # look up by key
ages["Grace"] = 85                        # add a new key
ages["Ada"] = 37                          # replace the value of an existing key
assert len(ages) == 3
assert "Alan" in ages and "Bob" not in ages         # 'in' tests the KEYS

assert ages.get("Bob") is None            # get: no error for a missing key
assert ages.get("Bob", 0) == 0            # ... with a default of your choice

del ages["Alan"]
assert list(ages) == ["Ada", "Grace"]     # looping gives the keys, in insertion order
assert list(ages.values()) == [37, 85]
assert list(ages.items()) == [("Ada", 37), ("Grace", 85)]
```

`ages["Bob"]` for a missing key raises a `KeyError`. Use `in` to test first, or `get` with a default.

A dictionary remembers the order in which keys were inserted. That is a guarantee of the language since Python 3.7. A set makes no such promise.

**Costs**, for a collection of n elements:

| Operation | List | Set or dictionary |
| --- | --- | --- |
| `x in collection` | Linear | Constant on average |
| Add an element | Constant on average (at the end) | Constant on average |
| Remove a given value | Linear | Constant on average |
| Look up by position | Constant | Not available |
| Keeps a meaningful order | Yes | Dictionary: insertion order. Set: no |

**The counting pattern.** A dictionary from each value to the number of times it has been seen.

```python
def count_letters(text: str) -> dict[str, int]:
    counts = {}
    for letter in text:
        counts[letter] = counts.get(letter, 0) + 1
    return counts


assert count_letters("banana") == {"b": 1, "a": 3, "n": 2}
assert count_letters("") == {}
```

**The grouping pattern.** A dictionary from a key to the list of items that share it.

```python
def group_by_length(words: list[str]) -> dict[int, list[str]]:
    groups = {}
    for word in words:
        if len(word) not in groups:
            groups[len(word)] = []
        groups[len(word)].append(word)
    return groups


assert group_by_length(["to", "be", "or", "not"]) == {2: ["to", "be", "or"], 3: ["not"]}
```

Tuples can be keys, which is how a dictionary stores information about pairs: `distance[("A", "B")] = 5`.

## 5. Worked example

Decide whether a list contains any duplicate value.

**First method: compare every pair.** For each position, look at every later position.

```python
def has_duplicate_slow(items: list[int]) -> bool:
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                return True
    return False
```

For n elements there are n(n − 1)/2 pairs. With no duplicates, all of them are compared: for a list of 100,000 elements that is about five billion comparisons.

**Second method: remember what has been seen.** Go through the list once. Before adding a value to a set, ask whether it is already there.

| Value | `seen` before | In `seen`? | Action |
| --- | --- | --- | --- |
| 4 | {} | no | add |
| 7 | {4} | no | add |
| 1 | {4, 7} | no | add |
| 7 | {4, 7, 1} | **yes** | return `True` |

```python
def has_duplicate(items: list[int]) -> bool:
    seen = set()
    for value in items:
        if value in seen:           # constant time on average
            return True
        seen.add(value)
    return False


assert has_duplicate([4, 7, 1, 7])
assert not has_duplicate([4, 7, 1])
assert not has_duplicate([])
assert has_duplicate([2, 2])

from itertools import product

for length in range(0, 6):
    for values in product(range(4), repeat=length):
        assert has_duplicate(list(values)) == has_duplicate_slow(list(values))
```

One pass with a constant-time test per element: about n steps where the first method needs about n²/2. The price is memory: the set may hold up to n values. Trading memory for time in this way is one of the most frequent moves in algorithm design.

An even shorter version, `len(set(items)) != len(items)`, is also linear. It cannot stop early at the first duplicate, which the loop can.

## 6. Try it

```python-run
words = "the quick brown fox jumps over the lazy dog the end".split()

counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1

for word, count in sorted(counts.items()):
    print(word, count)

print("distinct words:", len(set(words)))
print("most common:", max(counts, key=counts.get))
print("is 'cat' present?", "cat" in counts)
```

Things to try: print `counts["cat"]` and read the error, then use `counts.get("cat", 0)`. Try `{[1, 2]: "a"}` and read why a list cannot be a key.

## 7. Common mistakes

- **Writing `{}` for an empty set.** It is an empty dictionary. Use `set()`.
- **Reading a missing key with square brackets.** That raises `KeyError`. Use `in`, or `get` with a default.
- **Using a list as a key or a set element.** Lists are mutable and not hashable. Convert to a tuple.
- **Relying on the order of a set.** There is none. Sort when order matters.
- **Testing `x in list` in a loop.** Convert the list to a set once, before the loop.
- **Changing a dictionary's size while looping over it.** Python raises a `RuntimeError`. Loop over `list(d)` or build a new dictionary.

## 8. Practice

1. What are `len({1, 1, 2, 3, 3})`, `{1, 2} | {2, 3}`, `{1, 2} & {2, 3}` and `{1, 2} - {2, 3}`?
2. Write `first_repeated(items)` that returns the first value that occurs a second time, or `None`.
3. Write `most_common(items)` that returns a value with the highest count. What should it do when there is a tie? Decide and document it.
4. Two lists each have a million integers. Describe a way to find the values they have in common in time proportional to their total length.
5. Why can a tuple be a dictionary key when a list cannot?

Then solve **Remove duplicates** in the practice problems for this module.

## 9. Check your understanding

- [ ] I can explain in one or two sentences why looking up a key does not require scanning.
- [ ] I can write the counting pattern and the grouping pattern from memory.
- [ ] I can say which values can be keys and why.
- [ ] I can replace a quadratic "seen before?" loop with a linear one using a set.

## 10. Summary

A set stores distinct values and a dictionary maps keys to values. Both use hashing, so membership tests, insertions and lookups take constant time on average, where a list would scan. Keys must be immutable. Use a set for "have I seen this?", a dictionary for counting and grouping, and expect to pay for the speed with memory.

## 11. Further study

- The Python Tutorial, section 5.4, "Sets", and section 5.5, "Dictionaries".
- Python documentation, `collections.Counter` and `collections.defaultdict`, which package the counting and grouping patterns.
- Python Wiki, "TimeComplexity", for the average and worst-case costs of set and dictionary operations.

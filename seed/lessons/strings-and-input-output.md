## 1. Motivation

Text is data too. Checking whether a word is a palindrome, counting letters, and matching a pattern inside a document are all algorithms on strings, and a string behaves almost exactly like the lists you will meet next: it has a length, positions and slices. This lesson also covers how a program communicates: printing results, formatting them precisely, and why the problems on this site ask for a returned value and not for typed input.

## 2. Prerequisites

Lessons 1 to 5 of this module, in particular loops and functions.

## 3. The idea

A **string** is a sequence of characters. Three properties define how you work with it.

- **It is ordered and indexed.** Characters have positions, starting at 0.
- **It has a length**, given by `len`.
- **It is immutable.** A string can never be changed. Every operation that seems to modify a string builds a new one.

Immutability has a cost that matters for algorithms. Adding one character to the end of a string of length n copies all n characters. Doing that n times in a loop costs about n²/2 character copies. The standard remedy is in section 4.

## 4. Syntax and semantics

**Indexing and slicing.** For a string of length n the valid indices are 0 to n − 1. A negative index counts from the end. A slice `s[start:stop]` takes the characters from `start` up to but not including `stop`, the same convention as `range`.

| Expression | For `s = "search"` | Value |
| --- | --- | --- |
| `len(s)` | | `6` |
| `s[0]` | first character | `"s"` |
| `s[-1]` | last character | `"h"` |
| `s[1:4]` | indices 1, 2, 3 | `"ear"` |
| `s[:3]` | from the start | `"sea"` |
| `s[3:]` | to the end | `"rch"` |
| `s[::-1]` | reversed copy | `"hcraes"` |

```python
s = "search"
assert len(s) == 6
assert s[0] == "s" and s[-1] == "h"
assert s[1:4] == "ear"
assert s[:3] + s[3:] == s             # a split at any point loses nothing
assert s[::-1] == "hcraes"
assert s[2:2] == ""                   # an empty slice is an empty string, not an error
```

An index outside the valid range is an `IndexError`. A slice is more forgiving and simply stops at the end.

**Strings cannot be changed in place.** `s[0] = "S"` is a `TypeError`. Build a new string instead: `"S" + s[1:]`.

**Useful methods.** Each returns a new value and leaves the original alone.

```python
text = "  Binary Search  "
assert text.strip() == "Binary Search"            # remove surrounding spaces
assert text.strip().lower() == "binary search"
assert "search".upper() == "SEARCH"
assert "a,b,c".split(",") == ["a", "b", "c"]      # text to list
assert "-".join(["a", "b", "c"]) == "a-b-c"       # list to text
assert "ear" in "search"                          # substring test
assert "search".find("r") == 3                    # first position, or -1
assert "banana".count("an") == 2
assert "42".isdigit() and not "4.2".isdigit()
```

**Characters and their codes.** `ord` gives the integer code of a character and `chr` goes back. Letters are in alphabetical order, so `ord(c) - ord("a")` is the position of a lower-case letter in the alphabet.

```python
assert ord("a") == 97 and chr(97) == "a"
assert ord("d") - ord("a") == 3
assert "apple" < "banana"             # strings compare character by character
assert "Zebra" < "apple"              # upper-case letters come before lower-case
```

**Building a string efficiently.** Collect the pieces in a list and join them once at the end.

```python
def repeat_slow(piece: str, times: int) -> str:
    result = ""
    for _ in range(times):
        result += piece               # may copy everything built so far
    return result


def repeat_fast(piece: str, times: int) -> str:
    parts = []
    for _ in range(times):
        parts.append(piece)           # constant time on average
    return "".join(parts)             # one pass at the end


assert repeat_slow("ab", 3) == repeat_fast("ab", 3) == "ababab"
```

**Output.** `print` writes its arguments separated by spaces and ends the line. An **f-string** places values inside text and can format them.

```python
name, score = "Ada", 0.87654
assert f"{name} scored {score:.2f}" == "Ada scored 0.88"      # two decimal places
assert f"{42:>6}" == "    42"                                 # right-aligned in 6 columns
assert f"{7:03d}" == "007"                                    # padded with zeros
assert f"{1234567:,}" == "1,234,567"
```

**Input.** In a program run from a terminal, `input()` reads one line the user types and returns it as a string. It always returns text, so a number must be converted with `int` or `float`.

On this site, code runs in your browser with no keyboard attached to the program, so `input()` is not available. That is deliberate, and it matches how algorithms are written and tested everywhere: **the data arrives as arguments to a function, and the answer leaves as its return value.** When a practice problem says "given a list `items`", it means your function receives `items` as a parameter.

## 5. Worked example

Decide whether a string is a palindrome: the same read forwards and backwards.

One line works: `s == s[::-1]`. It builds a reversed copy, which uses extra memory proportional to the length. A second method compares characters from the two ends moving inwards and uses no extra memory. This is your first *two-pointer* algorithm, a technique with its own module later.

For `"level"`, with `left` starting at 0 and `right` at 4:

| `left` | `right` | Characters | Result |
| --- | --- | --- | --- |
| 0 | 4 | `l`, `l` | equal, move inwards |
| 1 | 3 | `e`, `e` | equal, move inwards |
| 2 | 2 | | `left < right` is false: stop, it is a palindrome |

```python
def is_palindrome(text: str) -> bool:
    """Return True if text reads the same forwards and backwards."""
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True


assert is_palindrome("level")
assert is_palindrome("noon")          # even length
assert not is_palindrome("search")
assert is_palindrome("")              # the loop never runs
assert is_palindrome("x")

# Both methods must agree on every input.
for word in ["", "a", "ab", "aba", "abba", "abca", "racecar", "python"]:
    assert is_palindrome(word) == (word == word[::-1])
```

The loop makes at most n // 2 comparisons for a string of length n, and stops at the first mismatch.

## 6. Try it

```python-run
word = "algorithm"

print(len(word))
print(word[0], word[-1])
print(word[:4], word[4:])
print(word.upper())
print(word[::-1])

# Count the vowels.
count = 0
for letter in word:
    if letter in "aeiou":
        count += 1
print(f"{word!r} has {count} vowels out of {len(word)} letters")

for i in range(len(word)):
    print(i, word[i])
```

Things to try: print `word[20]` and then `word[5:20]`. Add the line `word[0] = "A"` and read the error.

## 7. Common mistakes

- **Trying to modify a string.** Assigning to `s[0]` is an error. Build a new string.
- **Ignoring the return value of a method.** `s.upper()` on a line by itself changes nothing. Write `s = s.upper()`.
- **Off by one in a slice.** `s[a:b]` has `b - a` characters and does not include `s[b]`.
- **Concatenating in a loop.** Collect the pieces in a list and use `"".join(parts)`.
- **Forgetting that `input()` returns text.** `"5" + "5"` is `"55"`. Convert first.
- **Assuming comparison ignores case.** `"Zebra" < "apple"` is true. Compare `s.lower()` when case should not matter.
- **Printing when a return is required.** A function for a practice problem must `return` its answer.

## 8. Practice

1. For `s = "sorting"`, give `s[2]`, `s[-2]`, `s[1:5]`, `s[:2] + s[5:]` and `s[::2]`.
2. Write `count_character(text, target)` with a loop, without using the `count` method.
3. Write `is_palindrome_ignoring_case(text)` using the function from section 5.
4. Write `initials(full_name)` that turns `"ada king lovelace"` into `"AKL"`. Use `split` and `join`.
5. Explain why building a string of length n by repeated `+=` can take time proportional to n², and how `join` avoids it.

Then start the project for this module, which brings all six lessons together.

## 9. Check your understanding

- [ ] I can index and slice a string, including with negative indices.
- [ ] I can explain what "immutable" means and what it costs when building a string in a loop.
- [ ] I can format a number with an f-string.
- [ ] I can explain why a problem's data arrives as function arguments and not from `input()`.

## 10. Summary

A string is an immutable sequence of characters with a length, indices from 0 and slices that exclude their stop position. String methods return new strings. Build long strings with a list and `join`. Results are shown with `print` and f-strings, but a function communicates through its arguments and its return value.

## 11. Further study

- The Python Tutorial, section 3.1.2, "Text", and section 7, "Input and Output".
- Python documentation, "String Methods", for the full list.
- Python documentation, "Format Specification Mini-Language", for everything an f-string can do.

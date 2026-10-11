/** Starter programs for the Python playground. Each one runs as it stands and prints something. */

export interface PlaygroundExample {
  id: string;
  title: string;
  /** One or two sentences on what to notice when it runs. */
  explanation: string;
  code: string;
}

export const playgroundExamples: PlaygroundExample[] = [
  {
    id: "variables-and-types",
    title: "Variables and types",
    explanation:
      "A name refers to a value, and every value has a type. Notice the three kinds of division: / always gives a float, // rounds down, and % gives the remainder.",
    code: `count = 7
price = 2.5
name = "Ada"
ready = count > 5

print(count, type(count))
print(price, type(price))
print(name, type(name))
print(ready, type(ready))

print(count / 2)    # true division: always a float
print(count // 2)   # floor division: rounds down
print(count % 2)    # remainder
`,
  },
  {
    id: "lists",
    title: "Lists",
    explanation:
      "A list is an ordered, changeable sequence. Indices start at 0, a negative index counts from the end, and a slice copies part of the list.",
    code: `scores = [72, 85, 91, 60]

print(scores[0])      # first element
print(scores[-1])     # last element
print(scores[1:3])    # elements at index 1 and 2
print(len(scores))

scores.append(78)     # add at the end
scores[0] = 75        # replace in place
print(scores)
print(sorted(scores)) # a new, sorted list; scores is unchanged
print(scores)
`,
  },
  {
    id: "dictionaries",
    title: "Dictionaries",
    explanation:
      "A dictionary maps keys to values and finds a key without scanning. Counting things is its most common use in algorithms.",
    code: `word = "mississippi"

counts = {}
for letter in word:
    counts[letter] = counts.get(letter, 0) + 1

print(counts)
print(counts["s"])
print("z" in counts)   # membership tests the keys

for letter, count in sorted(counts.items()):
    print(letter, count)
`,
  },
  {
    id: "loops",
    title: "Loops",
    explanation:
      "A for loop visits each item of a sequence. A while loop repeats as long as its condition holds, so something in the body must eventually make the condition false.",
    code: `total = 0
for number in range(1, 6):   # 1, 2, 3, 4, 5
    total += number
print("sum:", total)

# How many times can 100 be halved before it reaches 1?
value = 100
steps = 0
while value > 1:
    value //= 2
    steps += 1
print("halvings:", steps)
`,
  },
  {
    id: "functions",
    title: "Functions",
    explanation:
      "A function takes arguments and returns a value. Returning is not printing: the caller receives a returned value and can use it, while printed text only appears on the screen.",
    code: `def average(values):
    """Return the mean of a non-empty list of numbers."""
    return sum(values) / len(values)


result = average([4, 8, 15, 16, 23, 42])
print(result)
print(average([10, 20]) + 1)   # a returned value can be used in an expression

assert average([5]) == 5
assert average([1, 2, 3]) == 2
print("all checks passed")
`,
  },
  {
    id: "recursion",
    title: "Recursion",
    explanation:
      "A recursive function solves a problem by calling itself on a smaller one. It needs a base case that returns without a further call, and each call must move towards it.",
    code: `def factorial(n):
    """Return n! for an integer n >= 0."""
    if n == 0:                       # base case
        return 1
    return n * factorial(n - 1)      # smaller problem


for n in range(6):
    print(n, factorial(n))


def countdown(n):
    if n == 0:
        print("done")
        return
    print(n)
    countdown(n - 1)


countdown(3)
`,
  },
  {
    id: "linear-search",
    title: "Linear search",
    explanation:
      "Examine each position in turn until the target is found. On a list of n elements this makes at most n comparisons, and works whether or not the list is sorted.",
    code: `def linear_search(items, target):
    """Return the first index i with items[i] == target, or -1."""
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1


data = [14, 3, 27, 8, 19, 5, 22]
print(linear_search(data, 19))   # 4
print(linear_search(data, 6))    # -1: not present
print(linear_search([], 1))      # -1: nothing to examine
`,
  },
  {
    id: "binary-search",
    title: "Binary search",
    explanation:
      "On a sorted list, one comparison with the middle element rules out half of what remains. That needs about log2(n) comparisons, but only works because the list is sorted.",
    code: `def binary_search(items, target):
    """Return an index i with items[i] == target, or -1. items must be sorted."""
    lo, hi = 0, len(items) - 1
    steps = 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        print("step", steps, "range", (lo, hi), "middle value", items[mid])
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


data = [3, 8, 12, 17, 23, 31, 42, 56, 64, 71]
print("found at index", binary_search(data, 42))
print("found at index", binary_search(data, 40))
`,
  },
];

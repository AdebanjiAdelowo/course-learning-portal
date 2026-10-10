import type { SeedModulePlan } from "./types";

/**
 * Plans for modules that are on the learning path but not written yet.
 *
 * A plan fixes what a module will teach: its objectives, its lessons, what must come before it,
 * and the examples, exercises and visualizations it needs. Students see the objectives, lesson
 * titles and prerequisites in the learning path. A `spec` on a lesson is an authoring brief and
 * is not shown to anyone.
 *
 * Every lesson, once written, follows the same twelve sections as the published ones:
 * motivation, intuition, visualization, formal explanation, pseudocode, Python implementation,
 * correctness, complexity, worked example, practice, assessment, further study.
 */

// ---------------------------------------------------------------------------
// Phase: Python foundations
// ---------------------------------------------------------------------------

export const pythonEssentials: SeedModulePlan = {
  objectives: [
    "Read and write Python programs built from variables, expressions, conditions, loops and functions",
    "Predict the value and type of an expression, including integer division and remainder",
    "Trace a loop by hand, recording the value of every variable after each iteration",
    "Write a function with a precise docstring stating what it requires and what it returns",
    "Read input and print results in the formats used by the practice problems",
  ],
  prerequisites: [],
  lessons: [
    {
      title: "Values, variables and types",
      summary: "Integers, floats, booleans and strings; names bound to values; what an assignment does and does not do.",
      spec: {
        durationMinutes: 40,
        objectives: [
          "Distinguish a value, its type, and a name that refers to it",
          "Evaluate arithmetic expressions by hand, including //, % and **, with the correct precedence",
          "Explain why 7 / 2, 7 // 2 and -7 // 2 give 3.5, 3 and -4",
          "Trace a sequence of assignments in a table of names and values",
          "Explain why Python integers do not overflow, and why floats are not exact",
        ],
        sections: [
          { heading: "Motivation", covers: "Every algorithm in the course is a sequence of assignments and comparisons. Reading one line wrongly makes every trace after it wrong, so this lesson fixes the meaning of the smallest pieces." },
          { heading: "Intuition", covers: "A name is a label attached to a value, not a box that holds it. Assignment moves the label. Use the picture of labels and values that the mutability lesson later builds on." },
          { heading: "Visualization", covers: "A trace table stepped one assignment at a time: columns for each name, one row per executed line. Candidate for a new 'trace table' visualization; until it exists, a static table." },
          { heading: "Formal explanation", covers: "Expression, value, type, statement. Evaluation order and operator precedence. Floor division and remainder defined by a = (a // b) * b + (a % b), with the sign rule for negative operands." },
          { heading: "Pseudocode", covers: "The pseudocode conventions used in the whole course (assignment with =, indices from 0, floor(x)), side by side with the Python that implements each." },
          { heading: "Python implementation", covers: "Short runnable blocks ending in assertions: arithmetic, comparison, boolean operators, type(), int() and float() conversion, f-strings for output." },
          { heading: "Correctness", covers: "How to check a claim about an expression: evaluate by hand, then assert. The identity a == (a // b) * b + a % b is checked for a range of positive and negative values." },
          { heading: "Complexity", covers: "A first, informal idea of a step: one arithmetic operation or comparison counts once. The cost model itself is taught in Algorithms, correctness and cost." },
          { heading: "Worked example", covers: "Convert a number of seconds into hours, minutes and seconds using // and %, traced line by line, including the input 0 and an input larger than one day." },
          { heading: "Practice", covers: "Hand-evaluation exercises, then two coding problems: split a duration, and extract the last digit and the remaining digits of a non-negative integer." },
          { heading: "Assessment", covers: "A checklist the student can test themselves against, matching the objectives above." },
          { heading: "Further study", covers: "The official Python tutorial, sections 3.1 (numbers and strings) and 4.1 to 4.4, and the documentation of the numeric types." },
        ],
        workedExamples: [
          "Seconds to hours, minutes and seconds with // and %",
          "Swapping two names with and without a temporary, traced in a table",
        ],
        exercises: [
          "Predict then check: twelve expressions mixing /, //, %, ** and comparison operators",
          "Coding: last_digit(n) and without_last_digit(n) for n >= 0, the two operations digit algorithms are built from",
          "Coding: split_duration(seconds) returning (hours, minutes, seconds)",
        ],
        assessment: [
          "Given six lines of assignments, produce the final table of names and values",
          "State the result and type of an expression without running it",
          "Explain in one sentence why 0.1 + 0.2 == 0.3 is False",
        ],
      },
    },
    { title: "Conditions and boolean logic", summary: "if, elif and else; and, or and not; writing a condition that says exactly what you mean." },
    { title: "Loops: for, while and range", summary: "Repetition, loop variables, off-by-one errors, and tracing a loop iteration by iteration." },
    { title: "Functions, parameters and return values", summary: "Defining and calling functions, the difference between printing and returning, and docstrings as contracts." },
    { title: "Input, output and reading a problem statement", summary: "Turning a written task into a function signature, and formatting results exactly." },
  ],
  workedExamples: [
    "Seconds to hours, minutes and seconds",
    "Sum of the digits of an integer with a while loop, traced by hand",
    "Largest of three numbers written three ways, compared for clarity",
  ],
  practice: [
    "Sum of digits of a non-negative integer",
    "Count the multiples of k between a and b inclusive",
    "Decide whether a year is a leap year",
    "Greatest common divisor by repeated subtraction, as a first algorithm",
  ],
  visualizations: ["Trace table: variables after each executed line"],
};

export const pythonCollections: SeedModulePlan = {
  objectives: [
    "Choose between a list, a tuple, a string, a dictionary and a set for a given task",
    "Index, slice and iterate over sequences without off-by-one errors",
    "Predict when two names refer to the same object, and what a function can change in its arguments",
    "Write assertions and small test tables for a function before trusting it",
    "Find a bug by reading a traceback and tracing the failing input by hand",
    "Read and write a simple recursive function, identifying its base case",
  ],
  prerequisites: ["python-essentials"],
  lessons: [
    { title: "Lists and tuples", summary: "Indexing, slicing, appending and iterating; when a sequence should be immutable." },
    { title: "Strings", summary: "Strings as immutable sequences of characters: indexing, slicing, joining and building results efficiently." },
    { title: "Dictionaries and sets", summary: "Looking things up by key, counting occurrences, and testing membership." },
    { title: "Names, references and mutability", summary: "Aliasing, copying, and why a function can change the list it is given but not the integer." },
    { title: "Testing and debugging functions", summary: "Assertions, edge cases, reading tracebacks, and comparing against a slower method you trust." },
    { title: "A first look at recursion", summary: "A function that calls itself on a smaller input: base case, recursive case, and the call stack." },
  ],
  workedExamples: [
    "Reverse a list in place with two indices, and by slicing, and compare what each changes",
    "Count the frequency of each character in a string with a dictionary",
    "A function that appends to its argument, called twice, traced with a diagram of names and objects",
    "Factorial and the sum of a list written recursively, with the stack drawn for n = 4",
  ],
  practice: [
    "Second largest value in a list, without sorting",
    "Is this string a palindrome, ignoring case and spaces",
    "Group words by their length with a dictionary",
    "Remove duplicates from a list while keeping the original order",
    "Find the bug: three short functions, each failing one provided test",
  ],
  visualizations: ["Names and objects: aliasing and copying shown as arrows", "Call stack of a recursive function"],
};

// ---------------------------------------------------------------------------
// Phase: Linear structures and sorting
// ---------------------------------------------------------------------------

export const twoPointers: SeedModulePlan = {
  objectives: [
    "Recognise problems on an array or string that two indices can solve in one pass",
    "Use opposite-direction pointers on sorted input, and prove with an invariant why moving one pointer never discards a solution",
    "Use same-direction (slow and fast) pointers to filter or compact an array in place",
    "Show that the running time is linear by bounding the total number of pointer moves",
    "Avoid the standard mistakes: wrong loop condition, moving both pointers, and using the technique on unsorted input",
  ],
  prerequisites: ["correctness-and-cost", "arrays-and-amortised-analysis"],
  lessons: [
    { title: "Opposite-direction pointers: pair sum in a sorted array", summary: "Two indices that start at the ends and move inwards, with the invariant that justifies each move." },
    { title: "Same-direction pointers: removing duplicates in place", summary: "A read index and a write index, and the invariant on the prefix already written." },
    { title: "More sorted-array problems", summary: "Merging two sorted lists, intersecting them, and partitioning around a value." },
    { title: "Analysis and common mistakes", summary: "Why the total work is linear, when the technique does not apply, and how each typical bug shows up in a trace." },
  ],
  workedExamples: [
    "Pair with a given sum in a sorted array of 8 elements, traced with both pointers, including a target that has no pair",
    "Remove duplicates from a sorted array in place, showing the written prefix after every step",
    "Merge two sorted lists of different lengths, including one empty list",
    "Is this string a palindrome, comparing from both ends",
  ],
  practice: [
    "Warm-up: reverse a list in place with two indices",
    "Warm-up: decide whether a string is a palindrome",
    "Core: find two values in a sorted list that sum to a target, in O(n) time and O(1) extra space",
    "Core: remove duplicates from a sorted list in place and return the new length",
    "Core: merge two sorted lists into one sorted list",
    "Challenge: count the pairs in a sorted list whose sum is at most a target",
    "Challenge: find three values that sum to a target in O(n^2) time",
  ],
  visualizations: [
    "Opposite-direction pointers on a sorted array, shading the pairs ruled out by each move",
    "Read and write pointers compacting an array in place",
  ],
};

export const slidingWindow: SeedModulePlan = {
  objectives: [
    "Recognise problems about contiguous subarrays or substrings that a moving window can solve",
    "Maintain a fixed-size window in O(1) per step by adding the entering element and removing the leaving one",
    "Grow and shrink a variable-size window, and state the invariant that holds each time it stops shrinking",
    "Summarise a window with a running sum or a frequency map, and update the summary incrementally",
    "Prove a linear running time by counting how often each element enters and leaves the window",
    "Say when a window does not work, for example sums with negative numbers, and what to use instead",
  ],
  prerequisites: ["correctness-and-cost", "arrays-and-amortised-analysis", "two-pointers", "python-collections-and-testing"],
  lessons: [
    { title: "Fixed-size windows and running sums", summary: "The maximum sum of k consecutive elements, without re-adding k numbers at every position." },
    { title: "Variable-size windows: the shortest valid subarray", summary: "Expand until the window is valid, shrink while it stays valid: the smallest subarray with sum at least a target." },
    { title: "Variable-size windows: the longest valid subarray", summary: "Expand while valid, shrink when it breaks: the longest substring without a repeated character." },
    { title: "Windows with frequency maps", summary: "Counting what is inside the window with a dictionary: at most k distinct values, and anagram search." },
    { title: "Analysis and common mistakes", summary: "The amortised argument for linear time, the monotonicity a window needs, and the usual off-by-one errors." },
  ],
  workedExamples: [
    "Maximum sum of 3 consecutive elements in a list of 8, showing the sum updated by one subtraction and one addition",
    "Smallest subarray with sum at least 7 in a list of positive integers, with the window drawn at every step",
    "Longest substring without a repeated character, with the set of characters in the window shown beside it",
    "A counterexample: why the shortest-subarray window fails when the list contains negative numbers",
  ],
  practice: [
    "Warm-up: maximum sum of k consecutive elements",
    "Warm-up: averages of every window of size k",
    "Core: length of the smallest subarray with sum at least a target, for positive integers",
    "Core: length of the longest substring without repeated characters",
    "Core: longest subarray with at most k distinct values",
    "Challenge: find every start index at which a permutation of a pattern occurs in a text",
    "Challenge: maximum of every window of size k in O(n) time",
  ],
  visualizations: [
    "Fixed window sliding across an array, with the running sum updated incrementally",
    "Variable window with left and right pointers, and the frequency map of its contents",
    "Counter of how many times each element has entered and left the window",
  ],
};

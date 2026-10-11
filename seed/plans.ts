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

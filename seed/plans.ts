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
    { title: "Two-pointer fundamentals and loop invariants", summary: "Two indices plus an invariant, in opposite-direction and same-direction layouts, with linear time proved by counting moves." },
    { title: "Opposite-direction pointers on sorted sequences", summary: "Pair sum in a sorted array, the invariant that justifies each move, counting pairs, and why unsorted input breaks it." },
    { title: "Same-direction pointers and in-place transformations", summary: "A read index and a write index: removing duplicates in place and moving zeros to the end in order." },
    { title: "Fast and slow pointers", summary: "Cycle detection in iterated functions, finding the cycle start, and locating a repeated value in constant space." },
    { title: "Pair, triplet and optimization problems", summary: "Triplets by repeated pair searches without duplicates, closest sums, and the exchange argument for the widest container." },
    { title: "Correctness proofs, complexity and pattern selection", summary: "A four-step proof template, merging and intersecting sorted lists, common mistakes, and choosing the right technique." },
  ],
  workedExamples: [
    "Pair with a given sum in a sorted array of 7 elements, traced with both pointers, including a target that has no pair",
    "Remove duplicates from a sorted array in place, showing the written prefix after every step",
    "Floyd's two phases on x * x + 1 modulo 10, with the tail and cycle lengths",
    "The widest container on nine walls, discarding the shorter wall each step",
    "Intersect two sorted lists with repeated values",
  ],
  practice: [
    "Core: find two values in a sorted list that sum to a target, in O(n) time and O(1) extra space",
    "Core: remove duplicates from a sorted list in place and return the kept prefix",
    "Warm-up: move every zero to the end while keeping the other values in order",
    "Warm-up: decide whether a string is a palindrome considering only letters and digits",
    "Challenge: find every distinct triplet with a target sum in O(n^2) time",
    "Core: choose two walls that hold the most water, in linear time",
  ],
  visualizations: [
    "Opposite-direction pointers on a sorted array, shading the pairs ruled out by each move",
    "Read and write pointers deduplicating an array in place",
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
    { title: "Sliding-window fundamentals", summary: "Contiguous ranges, summaries updated from entering and leaving values, and when a window is safe to use." },
    { title: "Fixed-size windows", summary: "Running sums and letter-count tables for windows of exactly k values, including negative values." },
    { title: "Variable-size windows", summary: "Expand and contract for the shortest and longest valid windows, and why sums need nonnegative values." },
    { title: "Frequency maps and character constraints", summary: "Counting what is inside the window: no repeats, at most k distinct values, and covering a pattern." },
    { title: "Advanced windows and monotonic validity", summary: "Closure under shrinking or growing, counting windows, exactly-k counts, positive products and monotonic queues." },
    { title: "Correctness, amortized analysis and limitations", summary: "Aggregate and accounting proofs of linear time, common mistakes, and prefix sums for values of any sign." },
  ],
  workedExamples: [
    "Maximum sum of 3 consecutive elements in a list of 8, with the running sum updated by one subtraction and one addition",
    "Smallest subarray with sum at least 7 in a list of positive integers, with the window drawn at every step",
    "Longest window without a repeated value, with the frequency map shown beside it",
    "Counterexamples: why the shortest-window and longest-window rules fail when the list contains negative numbers",
    "Windows with exactly 2 distinct values, counted as two at-most counts",
  ],
  practice: [
    "Warm-up: maximum sum of k consecutive elements",
    "Core: length of the smallest subarray with sum at least a target, for positive integers",
    "Core: length of the longest substring without repeated characters",
    "Core: decide whether a rearrangement of a pattern occurs in a text",
    "Challenge: the smallest window of a text that covers a pattern with multiplicity",
    "Challenge: the longest substring that becomes one repeated letter after at most k replacements",
  ],
  visualizations: [
    "Fixed window sliding across an array, with the running sum updated incrementally",
    "Variable window with left and right pointers, its validity and the best window so far",
    "Frequency map of the window's contents as it expands and contracts",
  ],
};

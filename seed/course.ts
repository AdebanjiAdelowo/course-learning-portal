import { linkedListsModule } from "./linked-lists-module";
import { arraysModule } from "./arrays-module";
import { recursionModule } from "./recursion-module";
import { slidingWindow, twoPointers } from "./plans";
import { pythonCollections, pythonEssentials } from "./python-foundations";
import type { SeedCourse, SeedModule, SeedModulePlan } from "./types";

/**
 * DSA Academy: Data Structures and Algorithms.
 *
 * This file is the academic blueprint: eight phases and thirty-four modules. The two Python
 * foundations modules are defined in `python-foundations.ts`. A module marked
 * `published: false` is planned. It shows in the learning path by title and description only,
 * and is published once its lessons, visualizations, problems and assessments are written.
 *
 * The blueprint below is a proposed outline. Reorder, rename or replace modules freely: the
 * application reads the structure from here (and from the instructor area), never from code.
 *
 * Text containing LaTeX uses String.raw so that backslashes survive.
 */
const md = String.raw;

/** A module that is on the learning path but not written yet. */
const planned = (slug: string, title: string, description: string, plan?: SeedModulePlan): SeedModule => ({
  slug,
  title,
  description,
  published: false,
  ...(plan ? { plan } : {}),
});

export const course: SeedCourse = {
  slug: "data-structures-and-algorithms",
  title: "Data Structures and Algorithms",
  subtitle: "A rigorous, visual course in designing, proving and analysing algorithms, taught in Python.",
  description:
    "Every topic is taught the same way: why the problem matters, the central idea, a step-by-step visualization, a precise statement, pseudocode, a tested Python implementation, a correctness argument, a cost analysis, worked examples, and then practice. The aim is to understand why an algorithm works well enough to design a new one, not to memorise a catalogue of solutions.",
  level: "Beginner to intermediate",
  outcomes: [
    "State a computational problem precisely and prove that an algorithm solves it",
    "Analyse running time and memory use, and compare algorithms by their growth rates",
    "Choose, implement and test the right data structure for a task",
    "Apply the main design techniques: divide and conquer, greedy choice and dynamic programming",
    "Model problems with graphs and solve them with the standard graph algorithms",
    "Recognise when a problem is unlikely to have an efficient exact algorithm",
  ],
  prerequisites: [
    "No earlier study of algorithms is assumed",
    "No earlier programming is assumed: the two Python foundations modules teach the Python the course uses. If you already write small programs with functions, loops and lists, you can start at DSA Module 1",
    "School-level algebra, including logarithms and summations",
    "Willingness to read and write short mathematical arguments. Proof by induction is taught as part of the course",
  ],
  instructor: {
    email: "instructor@example.com",
    fullName: "Adebanji Adelowo",
    timezone: "Europe/Rome",
    // Headline, biography, photo and links are deliberately empty. Fill them in under
    // Settings in the instructor's account; nothing about the instructor is invented here.
  },

  phases: [
    {
      slug: "python-foundations",
      title: "Python foundations",
      preparatory: true,
      description:
        "The Python this course is written in, and nothing more: enough to read, write, test and debug every implementation that follows.",
      modules: [
        pythonEssentials,
        pythonCollections,
      ],
    },
    {
      slug: "foundations",
      title: "Foundations",
      description: "What it means for an algorithm to be correct and efficient, and the mathematical tools used to show both.",
      modules: [
        {
          slug: "correctness-and-cost",
          title: "Algorithms, correctness and cost",
          description:
            "Problems and instances, loop invariants, the cost model, asymptotic notation, and the first two algorithms analysed in full: binary search and insertion sort.",
          requiresPrevious: false,
          lessons: [
            {
              slug: "algorithms-and-correctness",
              title: "Problems, algorithms and correctness",
              summary: "What an algorithm is, what it means for one to be correct, and how a loop invariant proves it.",
              durationMinutes: 35,
              objectives: [
                "Distinguish a problem, an instance and an algorithm",
                "State a problem as an input condition and an output condition",
                "Prove a loop correct with an invariant: initialisation, maintenance and exit",
                "Give a separate argument for termination",
              ],
              resources: [
                {
                  title: "MIT OpenCourseWare 6.006: Introduction to Algorithms (Spring 2020)",
                  description: "Lecture 1, Algorithms and Computation, covers the same ground with a different emphasis.",
                  kind: "video",
                  url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
                },
              ],
            },
            {
              slug: "counting-cost",
              title: "Counting cost: a model for running time",
              summary: "The RAM model, basic operations, and what best, worst and average case mean.",
              durationMinutes: 35,
              objectives: [
                "State what counts as one step in the RAM model",
                "Express running time as a function of input size",
                "Define best, worst and average case, and derive each for linear search",
                "Give a lower-bound argument for finding a maximum",
              ],
              resources: [
                {
                  title: "Open Data Structures (Pat Morin)",
                  description: "A free textbook. Chapter 1 sets out the model of computation used throughout.",
                  kind: "reading",
                  url: "https://opendatastructures.org/",
                },
              ],
            },
            {
              slug: "asymptotic-notation",
              title: "Asymptotic notation: O, Ω and Θ",
              summary: "Precise definitions of the three bounds, how to prove them with witnesses, and how to disprove them.",
              durationMinutes: 45,
              objectives: [
                "State the definitions of O, Ω and Θ with their quantifiers",
                "Prove an upper bound by exhibiting a witness",
                "Prove that a bound does not hold, by contradiction",
                "Rank the common growth rates and explain what each means in practice",
              ],
            },
            {
              slug: "binary-search",
              title: "Binary search",
              summary: "Searching a sorted list in logarithmic time, with a full proof of correctness, termination and cost.",
              durationMinutes: 50,
              objectives: [
                "State the precondition and the invariant of binary search",
                "Prove correctness, identifying where sortedness is used",
                "Prove termination from the size of the candidate range",
                "Derive the exact worst-case number of iterations",
              ],
              resources: [
                {
                  title: "Python documentation: the bisect module",
                  description: "Binary search in the standard library, and the difference between bisect_left and bisect_right.",
                  kind: "link",
                  url: "https://docs.python.org/3/library/bisect.html",
                },
              ],
            },
            {
              slug: "insertion-sort",
              title: "Insertion sort",
              summary: "The first sorting algorithm: its invariant, its best and worst cases, and the exact role of inversions.",
              durationMinutes: 50,
              objectives: [
                "State both parts of the output condition of sorting",
                "Prove insertion sort correct with an outer-loop invariant",
                "Derive the best-case and worst-case comparison counts",
                "Relate the number of shifts to the number of inversions",
                "Explain what makes the algorithm stable, in place and adaptive",
              ],
              resources: [
                {
                  title: "The Algorithm Design Manual (Steven Skiena): companion site",
                  description: "Lecture material and a problem catalogue to accompany the book.",
                  kind: "link",
                  url: "https://www.algorist.com/",
                },
              ],
            },
          ],
          quiz: {
            slug: "correctness-and-cost-quiz",
            title: "Assessment: correctness and cost",
            description: "Eight questions on invariants, the cost model, asymptotic notation, binary search and insertion sort.",
            passPercent: 70,
            questions: [
              {
                type: "multiple_choice",
                prompt: md`In the worst case, how does the number of iterations of binary search on a sorted list of $n$ elements grow?`,
                options: [md`$\Theta(n)$`, md`$\Theta(\log n)$`, md`$\Theta(n \log n)$`, md`$\Theta(1)$`],
                answer: 1,
                explanation: md`Each iteration that does not return at least halves the candidate range, so at most $\lfloor \log_2 n \rfloor + 1$ iterations are possible, and that many are needed for some targets.`,
              },
              {
                type: "true_false",
                prompt: md`If $f(n) = O(n^2)$, then $f(n)$ cannot be $O(n^3)$.`,
                answer: false,
                explanation: md`$O$ is an upper bound, not an exact description. If $f(n) \le c\,n^2$ for $n \ge n_0$ then also $f(n) \le c\,n^3$ for $n \ge \max(n_0, 1)$, so $f(n) = O(n^3)$ as well.`,
              },
              {
                type: "short_answer",
                prompt: md`A candidate range holds 1024 elements. How many times can it be halved before a single element remains? Answer with a number.`,
                accepted: ["10", "ten"],
                explanation: md`$1024 = 2^{10}$, so ten halvings reduce it to $2^0 = 1$. This is $\log_2 1024$.`,
              },
              {
                type: "multiple_select",
                prompt: "Which of the following must be shown to prove a loop correct using a loop invariant?",
                options: [
                  "The invariant holds before the first iteration",
                  "If the invariant holds before an iteration, it holds before the next",
                  "When the loop ends, the invariant together with the exit condition implies the result",
                  "The invariant mentions the running time of the loop",
                  "The invariant is false once the loop has ended",
                ],
                answers: [0, 1, 2],
                explanation:
                  "Initialisation, maintenance and usefulness at exit. An invariant says nothing about running time, and it is still true when the loop ends: that is exactly what makes it useful.",
                points: 2,
              },
              {
                type: "multiple_choice",
                prompt: "On which input of 6 distinct values does insertion sort make the most comparisons?",
                options: [
                  "Already sorted in increasing order",
                  "In random order",
                  "Sorted in decreasing order",
                  "The number of comparisons does not depend on the input",
                ],
                answer: 2,
                explanation: md`In decreasing order every key is smaller than everything before it and is compared with the whole sorted prefix: $1 + 2 + \dots + 5 = 15$ comparisons. A sorted input needs only 5.`,
              },
              {
                type: "multiple_choice",
                prompt: md`Which is the tightest correct description of $T(n) = 3n^2 + 10\,n \log_2 n + 5$?`,
                options: [md`$\Theta(n \log n)$`, md`$\Theta(n^2)$`, md`$\Theta(n^2 \log n)$`, md`$\Theta(n^3)$`],
                answer: 1,
                explanation: md`For $n \ge 2$, $n \log_2 n \le n^2$ and $1 \le n^2$, so $T(n) \le 18\,n^2$. Also $T(n) \ge 3n^2$. Both bounds hold, so $T(n) = \Theta(n^2)$. It is also $O(n^3)$, but that bound is not tight.`,
              },
              {
                type: "short_answer",
                prompt: "How many comparisons does linear search make, in the worst case, on a list of 250 elements? Answer with a number.",
                accepted: ["250"],
                explanation: md`The worst case is a target that is last or absent: every one of the $n = 250$ elements is compared with it.`,
              },
              {
                type: "true_false",
                prompt: "Binary search returns a correct answer on any list, sorted or not, as long as the list contains the target.",
                answer: false,
                explanation:
                  "Sortedness is a precondition. The maintenance step discards half of the range on the strength of one comparison, which is only justified when the list is sorted. On an unsorted list the target may be in the discarded half.",
              },
            ],
          },
          project: {
            slug: "measuring-growth",
            title: "Measure, model, explain",
            summary: "An empirical study of linear search, binary search and insertion sort, compared against the analysis from the lessons.",
            description: md`Theory predicts how many basic operations an algorithm performs. This project asks you to check those predictions by experiment, and to explain any difference you find.

Instrument your own implementations of **linear search**, **binary search** and **insertion sort** so that each reports the number of comparisons it makes. Then, for a range of input sizes $n$:

1. Measure the number of comparisons in the best case, the worst case, and on random inputs.
2. Compare each measurement with the formula derived in the lessons, such as $\lfloor \log_2 n \rfloor + 1$ for binary search and $\frac{n(n-1)}{2}$ for insertion sort.
3. Measure wall-clock time for the same runs and say how well it follows the comparison counts.

Present the results as tables or plots, with the predicted values beside the measured ones.

The purpose is the **explanation**. Where a measurement matches the theory, say which formula it matches. Where it does not, find out why. Timing in particular will not match perfectly, and working out the reasons is part of the task.`,
            objectives: [
              "Instrument an algorithm to count its basic operations",
              "Construct best-case and worst-case inputs deliberately, rather than hoping to find them",
              "Compare measurements against a derived formula",
              "Explain the difference between an operation count and a measured time",
            ],
            requirements: [
              "Your own implementations of the three algorithms, each tested against a trusted method on many small inputs",
              "Comparison counts for at least six input sizes, in best case, worst case and averaged over random inputs",
              "For random inputs: the number of trials, and the seed used, so the numbers can be reproduced",
              "Predicted and measured values side by side, with every formula stated",
              "A short written discussion of where time and comparison count disagree, and why",
            ],
            submissionInstructions:
              "Submit a link to a repository or hosted notebook. It must run from a clean checkout with one documented command, using only the Python standard library and, if you plot, matplotlib.",
            rubric: [
              { criterion: "Correctness", description: "The implementations are right, and the tests that show it are included.", points: 25 },
              { criterion: "Experimental method", description: "Best and worst cases are constructed deliberately; random trials are seeded and repeated.", points: 25 },
              { criterion: "Analysis", description: "Measurements are compared with the right formulas, and differences are explained.", points: 30 },
              { criterion: "Presentation", description: "Tables or plots are labelled and readable; the work reproduces from one command.", points: 20 },
            ],
            dueInDays: 9,
            resources: [
              {
                title: "Python documentation: the timeit module",
                description: "How to time small pieces of code without the common mistakes.",
                kind: "link",
                url: "https://docs.python.org/3/library/timeit.html",
              },
            ],
          },
          problems: [
            {
              slug: "first-occurrence",
              title: "First occurrence",
              summary: "Return the smallest index at which a value occurs in an unsorted list.",
              difficulty: "warm_up",
              constraints: ["0 ≤ len(items) ≤ 10^5", "Each element and the target are integers between -10^9 and 10^9"],
              hints: [
                "Scan from left to right. In which order must you examine the indices for the first match you meet to be the smallest one?",
                "State the invariant before writing the loop: what do you know about the indices already examined?",
                "Return as soon as you find a match. If the loop finishes, what does the invariant tell you?",
              ],
            },
            {
              slug: "is-sorted",
              title: "Is it sorted?",
              summary: "Decide in one pass whether a list is in non-decreasing order.",
              difficulty: "warm_up",
              constraints: ["0 ≤ len(items) ≤ 10^5", "Each element is an integer between -10^9 and 10^9"],
              hints: [
                "You do not need to compare every pair of positions. Which pairs are enough?",
                "If every element is at most its right-hand neighbour, what follows for two positions that are far apart?",
                "What should the function return for lists of length 0 and 1? Check that your loop handles them without a special case.",
              ],
            },
            {
              slug: "lower-bound",
              title: "Lower bound",
              summary: "Find the first position in a sorted list whose value is at least the target.",
              difficulty: "core",
              constraints: ["0 ≤ len(items) ≤ 10^5", "items is sorted in non-decreasing order", "Required time: O(log n)"],
              hints: [
                "The answer can be len(items). Make sure your search range can represent that.",
                "You are looking for a boundary, not a match: everything to its left is smaller than the target, everything from it onward is not. Never test for equality.",
                "Keep an invariant of the form: every index below lo is too small, and every index from hi upward is large enough. The loop ends when lo equals hi.",
              ],
            },
            {
              slug: "count-occurrences",
              title: "Count occurrences",
              summary: "Count how often a value occurs in a sorted list, in logarithmic time.",
              difficulty: "core",
              constraints: ["0 ≤ len(items) ≤ 10^5", "items is sorted in non-decreasing order", "Required time: O(log n), whatever the answer is"],
              hints: [
                "In a sorted list, equal values sit next to each other. Describe the block they occupy by where it starts and where it ends.",
                "The start of the block is exactly the answer to the Lower bound problem.",
                "The end of the block is the first index whose value is strictly greater than the target. That is the same boundary search with one comparison changed.",
              ],
            },
            {
              slug: "count-the-shifts",
              title: "Count the shifts",
              summary: "Report how many element moves insertion sort makes on a given list.",
              difficulty: "core",
              constraints: ["0 ≤ len(items) ≤ 2000", "Each element is an integer between -10^9 and 10^9", "The argument must not be modified"],
              hints: [
                "Start from the insertion sort in the lesson and add a counter. Where exactly does a shift happen?",
                "The caller's list must stay as it was. What should you sort instead?",
                "To check your answer independently, count the pairs of positions that are out of order. The lesson explains why the two numbers agree.",
              ],
            },
            {
              slug: "integer-square-root",
              title: "Integer square root",
              summary: "Compute the square root of a large integer, rounded down, using integer arithmetic only.",
              difficulty: "challenge",
              constraints: ["0 ≤ n ≤ 10^18", "Integer arithmetic only: no floating point", "Required: O(log n) iterations"],
              hints: [
                "There is no list to search, but consider the statement r * r <= n for r = 0, 1, 2, ... What pattern of true and false does it make?",
                "You want the last r for which the statement is true. Keep two numbers: one for which it is known to be true, one for which it is known to be false.",
                "Start with lo = 0 and hi = n + 1. Why is the statement certainly false for n + 1? Halve the gap until hi = lo + 1.",
              ],
            },
          ],
        },
        recursionModule,
        arraysModule,
        linkedListsModule,
      ],
    },
    {
      slug: "linear-structures-and-sorting",
      title: "Linear structures and sorting",
      description: "Array techniques, stacks and queues, then sorting as a case study in algorithm design and in lower bounds.",
      modules: [
        planned(
          "two-pointers",
          "Two pointers",
          "Two indices moving through one array, towards each other or in the same direction, to replace a quadratic search with a linear scan.",
          twoPointers,
        ),
        planned(
          "sliding-window",
          "Sliding window",
          "Maintaining a contiguous range and a summary of it as it moves: fixed and variable windows, running sums and frequency maps.",
          slidingWindow,
        ),
        planned("stacks-and-queues", "Stacks, queues and deques", "Abstract data types and their implementations, with applications from expression evaluation to breadth-first exploration."),
        planned("elementary-sorting", "Elementary sorting and stability", "Selection sort and bubble sort beside insertion sort: what they share, where they differ, and what stability buys."),
        planned("merge-sort-and-divide-and-conquer", "Divide and conquer: merge sort", "The divide-and-conquer pattern, merging, and the master theorem for its recurrences."),
        planned("quicksort-and-selection", "Quicksort, selection and randomisation", "Partitioning, expected running time, and finding the k-th smallest element in linear time."),
        planned("sorting-lower-bounds", "Lower bounds and linear-time sorting", "Why comparison sorting needs n log n comparisons, and how counting sort and radix sort avoid the bound."),
      ],
    },
    {
      slug: "hashing-and-trees",
      title: "Hashing and trees",
      description: "Data structures that support fast search, insertion and deletion.",
      modules: [
        planned("hash-tables", "Hash tables", "Hash functions, collision resolution, load factor, and how Python dictionaries and sets are built."),
        planned("binary-trees", "Binary trees and traversals", "Tree terminology, recursive structure, and the traversal orders with their uses."),
        planned("binary-search-trees", "Binary search trees", "The search-tree property, insertion and deletion, and why an unbalanced tree is no better than a list."),
        planned("balanced-search-trees", "Balanced search trees", "Rotations and the invariants that keep a search tree at logarithmic height."),
        planned("heaps-and-priority-queues", "Heaps and priority queues", "The binary heap, heapsort, and the priority queue as a building block for later algorithms."),
      ],
    },
    {
      slug: "graphs",
      title: "Graphs",
      description: "Modelling with graphs, and the algorithms that explore them and find optimal structures in them.",
      modules: [
        planned("graph-representations-and-bfs", "Graph representations and breadth-first search", "Adjacency lists and matrices, and shortest paths in unweighted graphs."),
        planned("depth-first-search", "Depth-first search and its applications", "Discovery and finish times, topological ordering, and connected and strongly connected components."),
        planned("dijkstra", "Shortest paths: Dijkstra's algorithm", "Shortest paths with non-negative weights, and the proof that the greedy choice is safe."),
        planned("bellman-ford-and-all-pairs", "Shortest paths: negative weights and all pairs", "Bellman-Ford, negative cycles, and the Floyd-Warshall algorithm."),
        planned("minimum-spanning-trees", "Minimum spanning trees", "The cut property, and the algorithms of Kruskal and Prim that follow from it."),
        planned("union-find", "Disjoint sets: union-find", "Union by rank and path compression, and a data structure whose analysis is harder than its code."),
      ],
    },
    {
      slug: "design-techniques",
      title: "Algorithm design techniques",
      description: "The general methods behind many specific algorithms, and how to prove each kind correct.",
      modules: [
        planned("greedy-algorithms", "Greedy algorithms", "When a locally best choice is globally best, and exchange arguments for proving it."),
        planned("dynamic-programming-foundations", "Dynamic programming: foundations", "Overlapping subproblems, optimal substructure, memoisation and tabulation on one-dimensional problems."),
        planned("dynamic-programming-sequences", "Dynamic programming: sequences and grids", "Longest common subsequence, edit distance and path-counting problems."),
        planned("dynamic-programming-advanced", "Dynamic programming: knapsack, intervals and trees", "Richer state spaces, reconstructing solutions, and pseudo-polynomial time."),
        planned("backtracking", "Backtracking and branch and bound", "Systematic search of a solution space, and pruning it with bounds."),
      ],
    },
    {
      slug: "strings-and-advanced-structures",
      title: "Strings and advanced structures",
      description: "Algorithms for text, and data structures for answering many queries quickly.",
      modules: [
        planned("string-matching", "String matching", "From the naive method to algorithms that use the structure of the pattern."),
        planned("tries", "Tries and prefix structures", "Storing sets of strings for prefix queries, with applications to search and completion."),
        planned("range-queries", "Range queries", "Prefix sums, Fenwick trees and segment trees: answering range questions under updates."),
      ],
    },
    {
      slug: "limits-and-synthesis",
      title: "Limits and synthesis",
      description: "What cannot be computed efficiently, as far as anyone knows, and bringing the course together.",
      modules: [
        planned("network-flow", "Network flow and matching", "Maximum flow, minimum cut, and the problems that reduce to them."),
        planned("intractability-and-capstone", "Intractability and capstone", "Reductions, NP-completeness, what to do with a hard problem, and a final project."),
      ],
    },
  ],

  cohorts: [
    {
      slug: "pilot",
      name: "Pilot cohort",
      description: "The first run of the course.",
      status: "running",
      startsInDays: -24,
      durationWeeks: 12,
      isPublic: false,
    },
    {
      slug: "next",
      name: "Next cohort",
      description: "Dates have not been set. Join the waiting list to be told when enrolment opens.",
      status: "waitlist",
      isPublic: true,
    },
  ],

  liveSessions: [
    {
      title: "Orientation: how the course works",
      description: "The twelve-step method each topic follows, how assessment works, and how to get help.",
      startsInDays: -20,
      startTime: "18:00",
      durationMinutes: 60,
      timezone: "Europe/Rome",
      moduleSlug: "correctness-and-cost",
      cohortSlug: "pilot",
      notes: md`**How each topic is taught**

Motivation, intuition, visualization, formal statement, pseudocode, Python, correctness, complexity, worked example, practice, assessment, further study. The order matters: you should be able to predict what an algorithm does before you read its code.

**How you are assessed**

- A quiz at the end of each module, with a pass mark of 70% and unlimited retakes.
- Coding problems, from warm-up to challenge. Run your code against the sample tests in your browser. Those results are local feedback, not a grade. Submitting unlocks the editorial for self-review.
- One project per module, reviewed against a published rubric.

Lessons, quizzes and projects count towards completion. Practice problems are tracked separately on your dashboard.`,
    },
    {
      title: "Workshop: writing loop invariants",
      description: "We wrote invariants together for six short loops, including two where the first attempt was true but useless.",
      startsInDays: -8,
      startTime: "18:00",
      durationMinutes: 75,
      timezone: "Europe/Rome",
      moduleSlug: "correctness-and-cost",
      cohortSlug: "pilot",
      notes: md`**A test for a candidate invariant**

1. Is it true before the first iteration? Check the empty-range case explicitly.
2. Does one pass of the loop preserve it?
3. At exit, does it say what you need? If not, it is too weak, however true it may be.

The most common mistake was an invariant that failed step 3: for example $i \ge 0$ for linear search.`,
    },
    {
      title: "Office hours: asymptotic proofs",
      description: "Bring a bound you could not prove, or one you proved and are not sure about.",
      startsInDays: 3,
      startTime: "18:00",
      durationMinutes: 60,
      timezone: "Europe/Rome",
      moduleSlug: "correctness-and-cost",
      cohortSlug: "pilot",
      meetingUrl: "https://meet.example.com/dsa-academy",
    },
    {
      title: "Problem session: binary search beyond arrays",
      description: "Lower bound, counting occurrences and searching on the answer, solved live from the invariant outward.",
      startsInDays: 10,
      startTime: "18:00",
      durationMinutes: 75,
      timezone: "Europe/Rome",
      moduleSlug: "correctness-and-cost",
      cohortSlug: "pilot",
      meetingUrl: "https://meet.example.com/dsa-academy",
    },
  ],

  announcements: [
    {
      title: "Run Python in your browser",
      body: "You can now run code without installing anything: in the **Playground**, in the runnable examples inside the Python lessons, and against the sample tests of every problem under **Practice**. Sample-test results are local feedback on your own device, not a grade.",
      publishedDaysAgo: 1,
    },
    {
      title: "Practice problems for correctness and cost are open",
      body: "Six problems, from warm-up to challenge, are now under **Practice**. Run your code against the sample tests, reveal hints one at a time, and submit to unlock the editorial for self-review. Submission does not mean the solution is correct.",
      pinned: true,
      publishedDaysAgo: 2,
    },
    {
      title: "Notes from the invariants workshop",
      body: "The notes are under **Live sessions**. Try the three-step test on your own invariants before the module quiz.",
      publishedDaysAgo: 7,
    },
  ],
};

import type { SeedModule } from "./types";

/** Authored draft integrated into the course; publication awaits browser verification. */
export const recursionModule: SeedModule = {
  slug: "recursion-and-induction",
  title: "Recursion, induction and recurrences",
  description: "Recursive algorithms, proofs by induction, and solving the recurrences that describe their cost.",
  requiresPrevious: true,
  published: true,
  lessons: [
    { slug: "recursive-calls-and-stack", title: "Recursive calls and the call stack", summary: "Trace descent, base cases and return values, and distinguish frame space from arithmetic bit costs.", durationMinutes: 45, objectives: ["Trace factorial's suspended calls", "Prove termination with a decreasing measure", "Prove correctness by induction", "Distinguish calls and stack depth"] },
    { slug: "induction-and-recursive-correctness", title: "Induction and recursive correctness", summary: "Use strong induction to prove balanced interval summation and justify every child's precondition.", durationMinutes: 50, objectives: ["State ordinary and strong induction", "Prove interval partitioning", "Separate correctness from termination", "Count calls and simultaneous frames"] },
    { slug: "recursive-binary-search", title: "Recursive binary search", summary: "Search half-open intervals recursively without copying slices, preserving the sorted-input contract.", durationMinutes: 40, objectives: ["Maintain valid half-open bounds", "Prove exclusion from sortedness", "Propagate a child's answer", "Analyze comparison count and frame depth"] },
    { slug: "fibonacci-and-overlapping-subproblems", title: "Fibonacci and overlapping subproblems", summary: "Explain why correct naive recursion takes exponential work, and compare iteration and memoization.", durationMinutes: 45, objectives: ["Identify repeated subproblems", "Derive the call-count recurrence", "Separate tree size from stack depth", "Explain cache lifetime and memory"] },
    { slug: "recurrences-and-recursion-trees", title: "Recurrences and recursion trees", summary: "Derive linear, logarithmic and n log n work from branches, shrinkage and work per node.", durationMinutes: 50, objectives: ["State a cost model", "Expand simple recurrences", "Label recursion-tree levels", "Prove a guessed bound"] },
    { slug: "recursion-design-and-debugging", title: "Designing and debugging recursive algorithms", summary: "Use balanced maximum finding to connect contracts, smaller subproblems, returned results and tests.", durationMinutes: 45, objectives: ["Establish inner-function preconditions", "Handle empty input explicitly", "Prove a combine rule", "Choose iteration when it removes needless frames"] },
  ],
  quiz: {
    slug: "recursion-and-induction-quiz", title: "Assessment: recursion, induction and recurrences", description: "Reason about calls, proofs and cost, not just syntax.", passPercent: 70,
    questions: [
      { type: "multiple_choice", prompt: "Factorial uses a base case at zero. How many calls does input 4 create, including the base case?", options: ["4", "5", "24", "8"], answer: 1, explanation: "Arguments are 4, 3, 2, 1 and 0: five calls. Multiplications number four." },
      { type: "true_false", prompt: "A recursive algorithm that always terminates must return a correct answer.", answer: false, explanation: "Termination says it stops. The returned value still needs a separate correctness argument; forgetting return terminates but yields None." },
      { type: "multiple_select", prompt: "Which obligations belong in a recursive correctness proof?", options: ["Base cases satisfy the contract", "Children satisfy their preconditions", "A measure decreases on every recursive edge", "All Python calls are optimized into loops"], answers: [0,1,2], explanation: "Base results, valid smaller calls and termination are required. Python does not optimize all recursive calls into loops." },
      { type: "short_answer", prompt: "Balanced summation on 8 elements has one singleton leaf per element. How many total calls does it make?", accepted: ["15", "fifteen"], explanation: "A full binary tree with eight leaves has seven internal nodes, so fifteen calls altogether." },
      { type: "multiple_choice", prompt: "Which recurrence matches recursive binary search implemented with index bounds?", options: ["T(n)=2T(n/2)+Theta(n)", "T(n)=T(n/2)+Theta(1)", "T(n)=T(n-1)+Theta(n)", "T(n)=Theta(1) for every input"], answer: 1, explanation: "Only one half is searched and no slices are copied, so each level adds constant work in the stated model." },
      { type: "true_false", prompt: "Memoization removes the recursion depth of a recursive Fibonacci implementation.", answer: false, explanation: "It removes repeated computation, but the first evaluation still descends through linearly many arguments." },
      { type: "multiple_choice", prompt: "What hypothesis is most convenient for balanced interval summation?", options: ["Correctness for every smaller interval length", "Correctness only for larger inputs", "The input has no negative values", "The whole input length is always a power of two"], answer: 0, explanation: "Strong induction covers both smaller child lengths, including uneven splits and intervals containing negatives." },
      { type: "short_answer", prompt: "What value is factorial's empty product, 0!?", accepted: ["1", "one"], explanation: "The identity for multiplication is one; returning zero would make every recursive multiplication zero." },
      { type: "multiple_select", prompt: "Which statements about the sum recursion tree are correct?", options: ["Stack depth is a path length", "Total calls count every tree node", "All leaf calls remain simultaneously on the stack", "Copying slices must be charged separately"], answers: [0,1,3], explanation: "Depth-first evaluation retains a path, not the entire level. Copies add work and retained data beyond frame counts." },
      { type: "multiple_choice", prompt: "A recursion repeatedly calls itself with the same interval. What proof obligation fails?", options: ["A strictly decreasing measure", "The input is represented in JSON", "The function has a name", "Python supports multiplication"], answer: 0, explanation: "The interval may never reach a base case when its length does not decrease. A smaller-call argument is essential." },
    ],
  },
  project: {
    slug: "recursive-algorithm-laboratory", title: "A recursive algorithm laboratory", summary: "Implement, instrument, prove and compare recursive algorithms without using timing as proof.",
    description: "Build a small standard-library Python laboratory for recursive search, balanced summation and Fibonacci. Compare each with an iterative counterpart. Submit code, deterministic tests, traces and a written analysis identifying preconditions, base cases, decreasing measures, recurrences and maximum frame depths.",
    objectives: ["Connect traces to proofs", "Separate time and frame space", "Recognize repeated subproblems"],
    requirements: ["Implement all three algorithms with documented contracts", "Test empty, singleton, negative and absent-target cases where valid", "Count calls, arithmetic operations and maximum depth", "Prove correctness and termination for balanced summation", "Compare naive and cached Fibonacci on small bounded inputs", "Explain slicing costs and Python's recursion limit"],
    submissionInstructions: "Submit a repository or notebook URL containing source, deterministic tests and a written report. Browser sample results are feedback, not a grade.",
    dueInDays: 28,
    rubric: [
      { criterion: "Implementation and contracts", description: "Correct behavior, valid inputs and useful edge-case handling", points: 30 },
      { criterion: "Proofs", description: "Explicit inductive hypotheses and decreasing measures", points: 25 },
      { criterion: "Analysis and traces", description: "Accurate counts, recurrences and distinction between total work and retained frames", points: 25 },
      { criterion: "Tests and communication", description: "Reproducible tests and a readable report that does not confuse measurements with proofs", points: 20 },
    ],
  },
  problems: [
    { slug: "recursive-sum", title: "Recursive suffix sum", summary: "Sum a bounded integer sequence with a shrinking suffix.", difficulty: "warm_up", constraints: ["At most 100 integers, each within -1000..1000", "No mutation, slices or sum()"], hints: ["An empty suffix sums to zero.", "At index i, combine items[i] with the sum beginning at i+1."] },
    { slug: "recursive-factorial", title: "Recursive factorial", summary: "Compute the empty product and recursively extend it.", difficulty: "warm_up", constraints: ["0 <= n <= 15", "Recursion required; no loops or math.factorial"], hints: ["The empty product is one.", "The child argument n-1 must be smaller than n."] },
    { slug: "recursive-search", title: "Recursive binary search", summary: "Search sorted distinct values using interval bounds.", difficulty: "core", constraints: ["At most 100 distinct sorted integers", "Values and target within -1000..1000", "No slices; logarithmic comparisons"], hints: ["Use an empty half-open interval as the absence case.", "Exclude the midpoint from either child."] },
    { slug: "balanced-summation", title: "Balanced summation", summary: "Sum disjoint intervals while keeping logarithmic stack depth.", difficulty: "core", constraints: ["At most 100 integers, each within -1000..1000", "No sum() or slices; balanced recursion"], hints: ["Handle length zero and length one separately.", "The midpoint partitions the parent into two smaller intervals."] },
    { slug: "recursive-occurrence-count", title: "Balanced occurrence counting", summary: "Count a target through balanced recursive partitions.", difficulty: "challenge", constraints: ["At most 100 integers, each within -1000..1000", "No list.count(), mutation or slices"], hints: ["A singleton contributes zero or one.", "Counts from disjoint halves can be added."] },
  ],
};

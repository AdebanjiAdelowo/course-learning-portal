import type { SeedModule } from "./types";

/** Complete authored draft; publication requires review of the verified student experience. */
export const arraysModule: SeedModule = {
  slug: "arrays-and-amortised-analysis",
  title: "Arrays, dynamic arrays and amortised analysis",
  description: "How Python lists work underneath, why appending is cheap on average, and how to prove it.",
  requiresPrevious: true,
  published: true,
  lessons: [
    { slug: "array-model-and-indexing", title: "Array models, storage and indexing", summary: "Separate sequence abstractions, reference slots, indexing and value searches.", durationMinutes: 30, objectives: ["Calculate a slot address", "Distinguish indexing from search", "State the machine-word cost model"] },
    { slug: "array-insertion-deletion-and-traversal", title: "Traversal, insertion and deletion", summary: "Preserve order through correctly directed suffix shifts.", durationMinutes: 35, objectives: ["Prove shift direction safe", "Validate boundaries before mutation", "Count affected suffix work"] },
    { slug: "dynamic-array-capacity-and-growth", title: "Logical size, capacity and geometric growth", summary: "Trace allocation, copies and spare capacity in an explicit doubling model.", durationMinutes: 40, objectives: ["Maintain size <= capacity", "Trace resizing append", "Separate teaching models from CPython policies"] },
    { slug: "amortised-analysis-of-appends", title: "Aggregate, accounting and potential analysis", summary: "Prove amortized bounds without random-input assumptions.", durationMinutes: 45, objectives: ["Bound a geometric copy sum", "Explain a constant credit budget", "Telescope a normalized potential"] },
    { slug: "prefix-sums-and-range-queries", title: "Prefix sums and difference arrays", summary: "Answer static half-open range sums and batch range additions.", durationMinutes: 40, objectives: ["Prove prefix subtraction", "Handle empty and end boundaries", "Distinguish static queries from deferred updates"] },
    { slug: "in-place-array-transformations", title: "In-place transformations and invariants", summary: "Compact stable subsequences and reverse intervals with bounded storage.", durationMinutes: 40, objectives: ["Protect unread values", "Prove read/write and swap invariants", "Separate output and auxiliary space"] },
  ],
  quiz: {
    slug: "arrays-and-amortised-analysis-quiz", title: "Assessment: arrays and amortised analysis", description: "Reason about representations, shifts, amortized bounds, range boundaries and safe mutation.", passPercent: 70,
    questions: [
      { type: "multiple_choice", prompt: "A fixed-width slot array begins at address 256 with width 8. What is the address of index 3?", options: ["259", "280", "288", "Indexing requires traversal"], answer: 1, explanation: "The slot address is base + index * width: 256 + 3 * 8 = 280." },
      { type: "true_false", prompt: "Constant-time indexed access means finding an arbitrary value is also constant-time.", answer: false, explanation: "An index identifies a slot; a value may require comparing every logical element." },
      { type: "multiple_select", prompt: "Which claims hold for ordered insertion into a size-n array?", options: ["The boundary n is valid", "Shifting right to left protects unread sources", "Front insertion always takes constant time", "Growth can add copying work"], answers: [0, 1, 3], explanation: "Insertion at n appends; ordered suffix movement must protect sources; resizing may add copies." },
      { type: "short_answer", prompt: "Deleting index 2 from a size-6 array shifts how many following elements?", accepted: ["3", "three"], explanation: "Indices 3, 4 and 5 move left, so n - index - 1 = 3 shifts are required." },
      { type: "multiple_choice", prompt: "Our doubling model has size 4 and capacity 4. After one append, what are size and capacity?", options: ["5 and 5", "8 and 8", "5 and 8", "4 and 8"], answer: 2, explanation: "Capacity doubles to eight, but only the newly appended value increases logical size to five." },
      { type: "true_false", prompt: "Amortized constant append guarantees constant worst-case latency for every append.", answer: false, explanation: "A resize can copy all n elements. The amortized bound concerns total work across a sequence." },
      { type: "multiple_choice", prompt: "In the append-only doubling model, Phi = 2n - c. A non-resizing append has actual cost 1. What is its amortized cost?", options: ["1", "2", "3", "n"], answer: 2, explanation: "The potential increases by two because n increases and c does not. Actual plus potential change is three." },
      { type: "short_answer", prompt: "For A = [3,-2,5,1], what is the sum of the half-open range [1,3)?", accepted: ["3", "three"], explanation: "The range contains -2 and 5. Using prefixes, P[3] - P[1] = 6 - 3 = 3." },
      { type: "multiple_select", prompt: "Which difference-array rules implement addition of v to [l,r)?", options: ["Add v to D[l]", "Subtract v from D[r]", "Allocate n+1 markers so r=n is valid", "Read D directly as final values"], answers: [0, 1, 2], explanation: "The two markers start and cancel an increment. Prefix accumulation, rather than direct reads, reconstructs values." },
      { type: "multiple_choice", prompt: "Which invariant makes stable nonzero compaction safe?", options: ["write > read", "The valid prefix is the retained processed subsequence and write <= read", "The entire suffix is cleared each iteration", "The input must be sorted"], answer: 1, explanation: "The prefix records retained values in order, while write never runs ahead and overwrites unread input." },
    ],
  },
  project: {
    slug: "dynamic-array-laboratory", title: "Dynamic array laboratory", summary: "Implement and analyze a doubling array beside a unit-growth array.", description: "Build an explicit backing-buffer model with indexed access, append, insertion and deletion. Record size, capacity, copies and shifts. Compare geometric growth with unit growth using deterministic operation sequences, and explain the distinction between counts, asymptotic proofs and timing measurements.",
    objectives: ["Enforce representation invariants", "Connect traces with aggregate and potential proofs", "Validate transformations against independent oracles"],
    requirements: ["Implement all operations with boundary validation before mutation", "Test empty, singleton, full-capacity, front and end edits", "Track copying and shifting separately", "Prove correctness of suffix movement and capacity growth", "Prove a linear aggregate append bound and explain a normalized potential", "Compare unit growth on the same deterministic sequences", "Use Python lists as a behavioral oracle, not as a hidden replacement for the modeled buffer"],
    submissionInstructions: "Submit an HTTPS repository or notebook URL containing source, deterministic tests, count tables and written proofs. Browser results are educational feedback, not official grades.", dueInDays: 28,
    rubric: [
      { criterion: "Implementation and contracts", description: "Correct operations, bounds and size/capacity invariants", points: 30 },
      { criterion: "Correctness arguments", description: "Sound copy/shift invariants and termination reasoning", points: 25 },
      { criterion: "Cost analysis", description: "Separate counts, geometric proof, potential and unit-growth comparison", points: 25 },
      { criterion: "Testing and communication", description: "Independent oracles, boundaries and reproducible results", points: 20 },
    ],
  },
  problems: [
    { slug: "prefix-totals", title: "Prefix totals", summary: "Construct all half-open prefix sums including the empty prefix.", difficulty: "warm_up", constraints: ["At most 100 integers within -1000..1000", "Do not mutate input"], hints: ["Begin with the empty sum zero.", "Extend the previous prefix with the next value."] },
    { slug: "range-totals", title: "Static range sums", summary: "Preprocess once to answer many half-open range queries.", difficulty: "core", constraints: ["At most 100 values and 100 queries", "0 <= left <= right <= n"], hints: ["Store n+1 prefixes.", "Subtract the prefix before left from the prefix through right."] },
    { slug: "array-edit", title: "Ordered array edit", summary: "Simulate ordered insertion or deletion with explicit shifts.", difficulty: "core", constraints: ["At most 100 integers", "Insertion uses a boundary; deletion uses an existing index", "Preserve caller input"], hints: ["Copy the input before editing.", "Choose shift direction to protect unread sources."] },
    { slug: "stable-nonzero-compaction", title: "Stable nonzero compaction", summary: "Use read/write boundaries to retain nonzero values in order.", difficulty: "core", constraints: ["At most 100 integers", "Constant auxiliary storage in compaction kernel; returned prefix allocation allowed"], hints: ["The write index counts kept values.", "Do not increment write when skipping a zero."] },
    { slug: "reverse-segment", title: "Reverse a half-open segment", summary: "Reverse an interval in place while preserving its surroundings.", difficulty: "warm_up", constraints: ["At most 100 integers", "0 <= left <= right <= n", "Use swaps"], hints: ["The last included index is right-1.", "Stop when the two indices meet or cross."] },
    { slug: "batched-range-additions", title: "Batched range additions", summary: "Reconstruct overlapping interval additions from difference markers.", difficulty: "challenge", constraints: ["Length and update count at most 100", "Half-open updates with values within -1000..1000"], hints: ["Mark where an increment begins and ends.", "A running sum reconstructs each final position."] },
  ],
};

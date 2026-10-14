import { dynamicArray } from "./dynamic-array";
import { recursiveFactorial } from "./recursion";
import type { CellRole, VizAlgorithm, VizInput, VizStep } from "./types";

/** Collects steps, copying the mutable state so that every recorded step is a snapshot. */
function recorder() {
  const steps: VizStep[] = [];
  return {
    steps,
    push(step: Omit<VizStep, "array" | "roles" | "pointers" | "variables" | "counters"> & {
      array: (number | null)[];
      roles: CellRole[];
      pointers?: Record<string, number>;
      variables?: Record<string, string | number>;
      counters?: Record<string, number>;
    }) {
      steps.push({
        ...step,
        array: [...step.array],
        roles: [...step.roles],
        pointers: { ...step.pointers },
        variables: { ...step.variables },
        counters: { ...step.counters },
      });
    },
  };
}

const fill = (length: number, role: CellRole): CellRole[] => Array.from({ length }, () => role);

// ---------------------------------------------------------------------------

const linearSearch: VizAlgorithm = {
  id: "linear-search",
  title: "Linear search",
  needsTarget: true,
  requiresSorted: false,
  pseudocode: ["for i = 0 to n - 1", "    if A[i] == x", "        return i", "return -1"],
  trace({ array, target }: VizInput): VizStep[] {
    const x = target ?? 0;
    const n = array.length;
    const { steps, push } = recorder();
    let comparisons = 0;

    const roles = (i: number, found = false): CellRole[] =>
      array.map((_, k) => (k < i ? "discarded" : k === i ? (found ? "found" : "active") : "default"));

    push({
      line: null,
      explanation: `Search for x = ${x} in a list of ${n} ${n === 1 ? "element" : "elements"}, examining positions from left to right.`,
      array,
      roles: fill(n, "default"),
      variables: { x, n },
      counters: { comparisons },
    });

    for (let i = 0; i < n; i++) {
      push({
        line: 0,
        explanation:
          i === 0
            ? "Start at index 0. Nothing has been examined yet."
            : `Move to index ${i}. The invariant holds: x does not occur at any index below ${i}.`,
        array,
        roles: roles(i),
        pointers: { i },
        variables: { x, n, i },
        counters: { comparisons },
      });

      comparisons += 1;
      const value = array[i]!;
      if (value === x) {
        push({
          line: 1,
          explanation: `Compare A[${i}] = ${value} with x = ${x}. They are equal.`,
          array,
          roles: roles(i, true),
          pointers: { i },
          variables: { x, n, i },
          counters: { comparisons },
        });
        push({
          line: 2,
          explanation: `Return ${i}. No earlier index holds x, so this is its first occurrence. ${comparisons} ${comparisons === 1 ? "comparison was" : "comparisons were"} needed.`,
          array,
          roles: roles(i, true),
          pointers: { i },
          variables: { x, n, i },
          counters: { comparisons },
          result: `Found at index ${i}`,
        });
        return steps;
      }
      push({
        line: 1,
        explanation: `Compare A[${i}] = ${value} with x = ${x}. They differ, so index ${i} is ruled out.`,
        array,
        roles: roles(i),
        pointers: { i },
        variables: { x, n, i },
        counters: { comparisons },
      });
    }

    push({
      line: 3,
      explanation:
        n === 0
          ? "The list is empty, so the loop body never runs. Return -1."
          : `Every index has been examined without a match. Return -1. This is the worst case: ${comparisons} comparisons for n = ${n}.`,
      array,
      roles: fill(n, "discarded"),
      pointers: { i: n },
      variables: { x, n },
      counters: { comparisons },
      result: "Not found",
    });
    return steps;
  },
};

// ---------------------------------------------------------------------------

const binarySearch: VizAlgorithm = {
  id: "binary-search",
  title: "Binary search",
  needsTarget: true,
  requiresSorted: true,
  pseudocode: [
    "lo = 0",
    "hi = n - 1",
    "while lo <= hi",
    "    mid = floor((lo + hi) / 2)",
    "    if A[mid] == x",
    "        return mid",
    "    else if A[mid] < x",
    "        lo = mid + 1",
    "    else",
    "        hi = mid - 1",
    "return -1",
  ],
  trace({ array, target }: VizInput): VizStep[] {
    const x = target ?? 0;
    const n = array.length;
    const { steps, push } = recorder();
    let lo = 0;
    let hi = n - 1;
    let iterations = 0;

    const roles = (mid: number | null, found = false): CellRole[] =>
      array.map((_, k) => {
        if (k < lo || k > hi) return "discarded";
        if (k === mid) return found ? "found" : "active";
        return "candidate";
      });
    const size = () => Math.max(0, hi - lo + 1);

    push({
      line: 1,
      explanation: `Set lo = 0 and hi = ${hi}. The candidate range is the whole list: if x = ${x} occurs at all, it occurs between lo and hi.`,
      array,
      roles: roles(null),
      pointers: { lo, hi },
      variables: { x, n, lo, hi },
      counters: { iterations, "range size": size() },
    });

    while (lo <= hi) {
      iterations += 1;
      const mid = Math.floor((lo + hi) / 2);
      const value = array[mid]!;
      push({
        line: 3,
        explanation: `lo = ${lo} and hi = ${hi}, so the range has ${size()} ${size() === 1 ? "element" : "elements"}. Its middle index is mid = ${mid}.`,
        array,
        roles: roles(mid),
        pointers: { lo, mid, hi },
        variables: { x, n, lo, hi, mid },
        counters: { iterations, "range size": size() },
      });

      if (value === x) {
        push({
          line: 5,
          explanation: `A[${mid}] = ${value} equals x. Return ${mid} after ${iterations} ${iterations === 1 ? "iteration" : "iterations"}.`,
          array,
          roles: roles(mid, true),
          pointers: { lo, mid, hi },
          variables: { x, n, lo, hi, mid },
          counters: { iterations, "range size": size() },
          result: `Found at index ${mid}`,
        });
        return steps;
      }

      if (value < x) {
        lo = mid + 1;
        push({
          line: 7,
          explanation: `A[${mid}] = ${value} is less than x = ${x}. The list is sorted, so every index up to ${mid} holds a value less than x. Discard them: lo = ${lo}.`,
          array,
          roles: roles(null),
          pointers: { lo, hi },
          variables: { x, n, lo, hi },
          counters: { iterations, "range size": size() },
        });
      } else {
        hi = mid - 1;
        push({
          line: 9,
          explanation: `A[${mid}] = ${value} is greater than x = ${x}. The list is sorted, so every index from ${mid} upward holds a value greater than x. Discard them: hi = ${hi}.`,
          array,
          roles: roles(null),
          pointers: { lo, hi },
          variables: { x, n, lo, hi },
          counters: { iterations, "range size": size() },
        });
      }
    }

    push({
      line: 10,
      explanation:
        n === 0
          ? "The list is empty, so lo > hi from the start. Return -1."
          : `Now lo = ${lo} is greater than hi = ${hi}: the candidate range is empty. By the invariant x cannot be anywhere else, so return -1 after ${iterations} ${iterations === 1 ? "iteration" : "iterations"}.`,
      array,
      roles: fill(n, "discarded"),
      pointers: { lo, hi },
      variables: { x, n, lo, hi },
      counters: { iterations, "range size": 0 },
      result: "Not found",
    });
    return steps;
  },
};

// ---------------------------------------------------------------------------

const insertionSort: VizAlgorithm = {
  id: "insertion-sort",
  title: "Insertion sort",
  needsTarget: false,
  requiresSorted: false,
  pseudocode: [
    "for j = 1 to n - 1",
    "    key = A[j]",
    "    i = j - 1",
    "    while i >= 0 and A[i] > key",
    "        A[i + 1] = A[i]",
    "        i = i - 1",
    "    A[i + 1] = key",
  ],
  trace({ array }: VizInput): VizStep[] {
    const a: (number | null)[] = [...array];
    const n = a.length;
    const { steps, push } = recorder();
    let comparisons = 0;
    let shifts = 0;

    /** Cells 0..sortedEnd-1 are the sorted prefix; `hole` is the free slot while a key is lifted. */
    const roles = (sortedEnd: number, hole: number | null, active: number | null): CellRole[] =>
      a.map((_, k) => {
        if (k === hole) return "key";
        if (k === active) return "active";
        return k < sortedEnd ? "sorted" : "default";
      });

    push({
      line: null,
      explanation:
        n <= 1
          ? `A list of ${n} ${n === 1 ? "element" : "elements"} is already sorted. The outer loop never runs.`
          : "The first element on its own is a sorted prefix of length 1. Each step inserts the next element into the prefix.",
      array: a,
      roles: roles(Math.min(1, n), null, null),
      variables: { n },
      counters: { comparisons, shifts },
      ...(n <= 1 ? { result: "Sorted" } : {}),
    });

    for (let j = 1; j < n; j++) {
      const key = a[j]!;
      let i = j - 1;
      a[j] = null;
      push({
        line: 1,
        explanation: `Take key = ${key} from index ${j}. The prefix A[0..${j - 1}] is sorted, and the key must be inserted into it.`,
        array: a,
        roles: roles(j, j, null),
        pointers: { j, i },
        variables: { n, j, key, i },
        counters: { comparisons, shifts },
      });

      while (i >= 0) {
        comparisons += 1;
        const value = a[i]!;
        if (value <= key) {
          push({
            line: 3,
            explanation: `Compare A[${i}] = ${value} with key = ${key}. It is not greater, so the key belongs immediately to its right. Everything further left is no larger, because the prefix is sorted.`,
            array: a,
            roles: roles(j + 1, i + 1, i),
            pointers: { j, i },
            variables: { n, j, key, i },
            counters: { comparisons, shifts },
          });
          break;
        }
        push({
          line: 3,
          explanation: `Compare A[${i}] = ${value} with key = ${key}. It is greater, so it must move right to make room.`,
          array: a,
          roles: roles(j + 1, i + 1, i),
          pointers: { j, i },
          variables: { n, j, key, i },
          counters: { comparisons, shifts },
        });
        a[i + 1] = value;
        a[i] = null;
        shifts += 1;
        i -= 1;
        push({
          line: 4,
          explanation: `Shift ${value} one place to the right. This removes one inversion: ${value} and ${key} are now in the right order.`,
          array: a,
          roles: roles(j + 1, i + 1, null),
          pointers: { j, i },
          variables: { n, j, key, i },
          counters: { comparisons, shifts },
        });
      }

      a[i + 1] = key;
      push({
        line: 6,
        explanation:
          (i < 0 ? `The key is smaller than every element of the prefix, so it goes to index 0. ` : `Place the key at index ${i + 1}. `) +
          `The prefix A[0..${j}] is now sorted.`,
        array: a,
        roles: roles(j + 1, null, i + 1),
        pointers: { j },
        variables: { n, j, key },
        counters: { comparisons, shifts },
      });
    }

    if (n > 1) {
      push({
        line: null,
        explanation: `Sorted, with ${comparisons} ${comparisons === 1 ? "comparison" : "comparisons"} and ${shifts} ${shifts === 1 ? "shift" : "shifts"}. The number of shifts equals the number of inversions in the input.`,
        array: a,
        roles: fill(n, "sorted"),
        variables: { n },
        counters: { comparisons, shifts },
        result: "Sorted",
      });
    }
    return steps;
  },
};

export const registry: Record<string, VizAlgorithm> = {
  [dynamicArray.id]: dynamicArray,
  [recursiveFactorial.id]: recursiveFactorial,
  [linearSearch.id]: linearSearch,
  [binarySearch.id]: binarySearch,
  [insertionSort.id]: insertionSort,
};

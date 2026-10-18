import type { CellRole, VizAlgorithm, VizStep } from "./types";

const snapshot = (step: VizStep): VizStep => ({
  ...step,
  array: [...step.array],
  roles: [...step.roles],
  pointers: { ...step.pointers },
  variables: { ...step.variables },
  counters: { ...step.counters },
});

/**
 * Opposite-direction pointers search a sorted list for a pair with a given sum; same-direction
 * pointers remove duplicates from a sorted list in place. Both are deterministic traces of the
 * algorithms taught in the Two Pointers module. No student code is evaluated.
 */
export const twoPointers: VizAlgorithm = {
  id: "two-pointers",
  title: "Two pointers",
  needsTarget: true,
  requiresSorted: true,
  modes: [
    { id: "opposite", label: "Opposite-direction pair sum", needsTarget: true, requiresSorted: true, targetLabel: "Target sum" },
    { id: "same", label: "Same-direction deduplication", needsTarget: false, requiresSorted: true },
  ],
  pseudocode: [
    "opposite: lo = 0, hi = n - 1",
    "while lo < hi:  s = A[lo] + A[hi]",
    "    if s == target: return (lo, hi)",
    "    if s < target: lo = lo + 1   else: hi = hi - 1",
    "same: write = 1",
    "for read = 1 to n - 1:  if A[read] != A[write - 1]",
    "        A[write] = A[read]; write = write + 1",
    "return the result",
  ],
  trace({ array, target, mode = "opposite" }) {
    if (array.length > 12 || !array.every(Number.isSafeInteger)) throw new RangeError("Use at most 12 integers.");
    if (!array.every((value, i) => i === 0 || array[i - 1]! <= value)) throw new RangeError("Both modes require sorted input.");
    if (mode === "same") return dedupe(array);
    if (mode !== "opposite" || target === undefined) throw new RangeError("Opposite-direction pointers need a target sum.");
    return pairSum(array, target);
  },
};

function pairSum(array: readonly number[], target: number): VizStep[] {
  const steps: VizStep[] = [];
  const n = array.length;
  let lo = 0;
  let hi = n - 1;
  let sums = 0;
  let moves = 0;
  const roles = (found = false): CellRole[] =>
    array.map((_, k) => (k < lo || k > hi ? "discarded" : k === lo || k === hi ? (found ? "found" : "active") : "candidate"));
  const push = (line: number | null, explanation: string, extra: Partial<VizStep> = {}, found = false) =>
    steps.push(snapshot({
      line,
      explanation,
      array: [...array],
      roles: roles(found),
      pointers: n === 0 ? {} : { lo, hi },
      variables: { target, lo, hi, ...(extra.variables ?? {}) },
      counters: { sums, moves },
      ...(extra.result ? { result: extra.result } : {}),
    }));

  push(0, `Search a sorted list of ${n} values for two entries that sum to ${target}. Invariant: no pair using an index outside [lo, hi] sums to the target.`);
  while (lo < hi) {
    const s = array[lo]! + array[hi]!;
    sums++;
    if (s === target) {
      push(2, `A[${lo}] + A[${hi}] = ${array[lo]} + ${array[hi]} = ${s}, the target. Return this pair.`, { variables: { s }, result: `Pair (${lo}, ${hi})` }, true);
      return steps;
    }
    if (s < target) {
      push(3, `${array[lo]} + ${array[hi]} = ${s} is below ${target}. A[${hi}] is the largest value still in range, so A[${lo}] pairs with nothing remaining: rule out index ${lo}.`, { variables: { s } });
      lo++;
    } else {
      push(3, `${array[lo]} + ${array[hi]} = ${s} is above ${target}. A[${lo}] is the smallest value still in range, so A[${hi}] pairs with nothing remaining: rule out index ${hi}.`, { variables: { s } });
      hi--;
    }
    moves++;
  }
  push(7, `The pointers met after ${moves} ${moves === 1 ? "move" : "moves"}, at most n - 1 = ${Math.max(n - 1, 0)}. Every pair was ruled out, so no pair sums to ${target}.`, { result: "No pair" });
  return steps;
}

function dedupe(input: readonly number[]): VizStep[] {
  const steps: VizStep[] = [];
  const a = [...input];
  const n = a.length;
  let write = Math.min(1, n);
  let reads = 0;
  let writes = 0;
  const roles = (read: number | null, done = false): CellRole[] =>
    a.map((_, k) => (k < write ? "sorted" : k === read ? "active" : done || (read !== null && k < read) ? "discarded" : "default"));
  const push = (line: number | null, explanation: string, read: number | null, result?: string) =>
    steps.push(snapshot({
      line,
      explanation,
      array: [...a],
      roles: roles(read, result !== undefined),
      pointers: n === 0 ? {} : read === null ? { write } : { write, read },
      variables: { write, ...(write > 0 ? { "last kept": a[write - 1]! } : {}) },
      counters: { reads, writes },
      ...(result ? { result } : {}),
    }));

  if (n === 0) {
    push(4, "An empty list has no values to keep.", null, "Kept 0 values");
    return steps;
  }
  push(4, "The first value is always kept. Invariant: A[0:write] holds each distinct value of the processed prefix exactly once, in order.", null);
  for (let read = 1; read < n; read++) {
    reads++;
    if (a[read] !== a[write - 1]) {
      a[write] = a[read]!;
      writes++;
      write++;
      push(6, `A[${read}] = ${a[read]} differs from the last kept value, so copy it to index ${write - 1}. write never passes read, so no unread value is overwritten.`, read);
    } else {
      push(5, `A[${read}] = ${a[read]} equals the last kept value. Sorted order puts every copy next to each other, so skip it.`, read);
    }
  }
  push(7, `Each index was read once: ${reads} reads and ${writes} writes. The first ${write} positions hold the distinct values; the rest are leftovers outside the contract.`, null, `Kept ${write} ${write === 1 ? "value" : "values"}`);
  return steps;
}

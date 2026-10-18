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
 * Deterministic traces of the three window patterns taught in the Sliding Window module: a fixed
 * window with a running sum, the shortest window whose sum reaches a target (nonnegative values
 * only), and the longest window without a repeated value (a frequency map). Each step shows the
 * window [left, right], whether it is valid, and the best result so far.
 */
export const slidingWindow: VizAlgorithm = {
  id: "sliding-window",
  title: "Sliding window",
  needsTarget: true,
  requiresSorted: false,
  modes: [
    {
      id: "fixed",
      label: "Fixed window: best sum of k",
      needsTarget: true,
      requiresSorted: false,
      targetLabel: "Window size k",
      validate: (array, k) => (k === undefined || k < 1 || k > array.length ? `Window size k must be between 1 and the list length (${array.length}).` : null),
    },
    {
      id: "shortest",
      label: "Shortest window with sum at least the target",
      needsTarget: true,
      requiresSorted: false,
      targetLabel: "Target sum",
      validate: (array, target) => {
        if (array.some((value) => value < 0)) return "Shortest-window contraction needs nonnegative values: with a negative value, removing an element can raise the sum, so a window that fails could become valid again.";
        if (target === undefined || target < 1) return "The target sum must be at least 1.";
        return null;
      },
    },
    { id: "longest-distinct", label: "Longest window with no repeated value", needsTarget: false, requiresSorted: false },
  ],
  pseudocode: [
    "left = 0; summary of the empty window",
    "for right = 0 to n - 1:  add A[right] to the window",
    "    fixed: once the window has k values, remove A[right - k]",
    "    shortest: while sum >= target: record, remove A[left], left += 1",
    "    distinct: while A[right] is repeated: remove A[left], left += 1",
    "    if the window is valid: update best",
    "return best",
  ],
  trace({ array, target, mode = "fixed" }) {
    if (array.length > 12 || !array.every(Number.isSafeInteger)) throw new RangeError("Use at most 12 integers.");
    const spec = slidingWindow.modes!.find((m) => m.id === mode);
    if (!spec) throw new RangeError("Unknown sliding-window mode.");
    const problem = spec.validate?.(array, target);
    if (problem) throw new RangeError(problem);
    if (mode === "fixed") return fixed(array, target!);
    if (mode === "shortest") return shortest(array, target!);
    return longestDistinct(array);
  },
};

/** Builds a recorder for one trace; the window is [left, right], empty when right < left. */
function windowRecorder(array: readonly number[]) {
  const steps: VizStep[] = [];
  return {
    steps,
    push(state: {
      line: number | null;
      explanation: string;
      left: number;
      right: number;
      entering?: number;
      leaving?: number;
      best?: [number, number] | null;
      variables: Record<string, string | number>;
      counters: Record<string, number>;
      result?: string;
    }) {
      const { left, right, entering, leaving, best } = state;
      const roles: CellRole[] = array.map((_, k) => {
        if (state.result && best && k >= best[0] && k <= best[1]) return "found";
        if (k === entering || k === leaving) return "active";
        if (k >= left && k <= right) return "candidate";
        return k < left ? "discarded" : "default";
      });
      steps.push(snapshot({
        line: state.line,
        explanation: state.explanation,
        array: [...array],
        roles,
        pointers: array.length === 0 ? {} : { left, right },
        variables: state.variables,
        counters: state.counters,
        ...(state.result ? { result: state.result } : {}),
      }));
    },
  };
}

const range = (best: [number, number] | null) => (best ? `[${best[0]}, ${best[1]}]` : "none");

function fixed(array: readonly number[], k: number): VizStep[] {
  const { steps, push } = windowRecorder(array);
  let sum = 0;
  let additions = 0;
  let removals = 0;
  let best: [number, number] | null = null;
  let bestSum = -Infinity;
  const vars = (left: number, right: number) => ({ k, "window sum": sum, valid: right - left + 1 === k ? "yes" : "no", best: best ? bestSum : "none", "best window": range(best) });

  push({ line: 0, explanation: `Find the largest sum of ${k} consecutive values. A window is valid once it holds exactly k values.`, left: 0, right: -1, best, variables: vars(0, -1), counters: { additions, removals } });
  for (let right = 0; right < array.length; right++) {
    sum += array[right]!;
    additions++;
    let left = Math.max(0, right - k + 1);
    if (right >= k) {
      const leaving = right - k;
      sum -= array[leaving]!;
      removals++;
      left = leaving + 1;
      push({ line: 2, explanation: `Add A[${right}] = ${array[right]} and remove A[${leaving}] = ${array[leaving]}: two updates instead of re-adding ${k} values. Window sum is now ${sum}.`, left, right, entering: right, leaving, best, variables: vars(left, right), counters: { additions, removals } });
    } else {
      push({ line: 1, explanation: right + 1 < k ? `Add A[${right}] = ${array[right]}. The window holds ${right + 1} of ${k} values, so it is not valid yet.` : `Add A[${right}] = ${array[right]}. The first window is complete with sum ${sum}.`, left, right, entering: right, best, variables: vars(left, right), counters: { additions, removals } });
    }
    if (right - left + 1 === k && sum > bestSum) {
      bestSum = sum;
      best = [left, right];
      push({ line: 5, explanation: `Sum ${sum} is the best so far, for the window [${left}, ${right}].`, left, right, best, variables: vars(left, right), counters: { additions, removals } });
    }
  }
  const left = array.length - k;
  push({ line: 6, explanation: `Every one of the ${array.length - k + 1} windows was checked with ${additions} additions and ${removals} removals in total, so the work is linear in n.`, left, right: array.length - 1, best, variables: vars(left, array.length - 1), counters: { additions, removals }, result: `Best sum ${bestSum}` });
  return steps;
}

function shortest(array: readonly number[], target: number): VizStep[] {
  const { steps, push } = windowRecorder(array);
  let sum = 0;
  let left = 0;
  let entered = 0;
  let exited = 0;
  let best: [number, number] | null = null;
  const vars = (right: number) => ({ target, "window sum": sum, valid: sum >= target && right >= left ? "yes" : "no", "best length": best ? best[1] - best[0] + 1 : "none", "best window": range(best) });

  push({ line: 0, explanation: `Find the shortest window whose sum is at least ${target}. Values are nonnegative, so growing a window never lowers its sum and shrinking never raises it.`, left: 0, right: -1, best, variables: vars(-1), counters: { entered, left: exited } });
  for (let right = 0; right < array.length; right++) {
    sum += array[right]!;
    entered++;
    push({ line: 1, explanation: `Expand: add A[${right}] = ${array[right]}. Window sum is ${sum}${sum >= target ? `, which reaches ${target}` : `, still below ${target}`}.`, left, right, entering: right, best, variables: vars(right), counters: { entered, left: exited } });
    while (sum >= target) {
      if (!best || right - left < best[1] - best[0]) {
        best = [left, right];
        push({ line: 5, explanation: `The window [${left}, ${right}] is valid with length ${right - left + 1}, the shortest so far.`, left, right, best, variables: vars(right), counters: { entered, left: exited } });
      }
      const leaving = left;
      sum -= array[leaving]!;
      left++;
      exited++;
      push({ line: 3, explanation: `Contract: remove A[${leaving}] = ${array[leaving]} to look for a shorter valid window. Window sum is ${sum}${sum >= target ? ", still valid" : `, below ${target}, so stop shrinking`}.`, left, right, leaving, best, variables: vars(right), counters: { entered, left: exited } });
    }
  }
  push({ line: 6, explanation: `Each index entered once and left at most once (${entered} entries, ${exited} exits), so the loop does linear work. ${best ? `The shortest valid window has length ${best[1] - best[0] + 1}.` : `No window reaches ${target}; the answer is 0.`}`, left, right: array.length - 1, best, variables: vars(array.length - 1), counters: { entered, left: exited }, result: best ? `Shortest length ${best[1] - best[0] + 1}` : "No window" });
  return steps;
}

function longestDistinct(array: readonly number[]): VizStep[] {
  const { steps, push } = windowRecorder(array);
  const counts = new Map<number, number>();
  let left = 0;
  let entered = 0;
  let exited = 0;
  let best: [number, number] | null = null;
  const show = () => (counts.size === 0 ? "{}" : `{${[...counts].map(([value, count]) => `${value}: ${count}`).join(", ")}}`);
  const vars = (valid: boolean) => ({ counts: show(), valid: valid ? "yes" : "no", "best length": best ? best[1] - best[0] + 1 : 0, "best window": range(best) });

  push({ line: 0, explanation: "Find the longest window in which no value repeats. The frequency map counts each value inside the window.", left: 0, right: -1, best, variables: vars(true), counters: { entered, left: exited } });
  for (let right = 0; right < array.length; right++) {
    const value = array[right]!;
    counts.set(value, (counts.get(value) ?? 0) + 1);
    entered++;
    const repeated = counts.get(value)! > 1;
    push({ line: 1, explanation: `Expand: add A[${right}] = ${value}. ${repeated ? `${value} now appears twice, so the window is invalid.` : "Every value in the window is distinct."}`, left, right, entering: right, best, variables: vars(!repeated), counters: { entered, left: exited } });
    while (counts.get(value)! > 1) {
      const leaving = left;
      const old = array[leaving]!;
      const remaining = counts.get(old)! - 1;
      if (remaining === 0) counts.delete(old);
      else counts.set(old, remaining);
      left++;
      exited++;
      const valid = counts.get(value)! <= 1;
      push({ line: 4, explanation: `Contract: remove A[${leaving}] = ${old}. ${valid ? "The repeat is gone and the window is valid again." : `${value} still repeats, so keep shrinking.`}`, left, right, leaving, best, variables: vars(valid), counters: { entered, left: exited } });
    }
    if (!best || right - left > best[1] - best[0]) {
      best = [left, right];
      push({ line: 5, explanation: `[${left}, ${right}] has ${right - left + 1} distinct values, the longest so far.`, left, right, best, variables: vars(true), counters: { entered, left: exited } });
    }
  }
  const length = best ? best[1] - best[0] + 1 : 0;
  push({ line: 6, explanation: `Each index entered once and left at most once (${entered} entries, ${exited} exits). The longest window without a repeat has length ${length}.`, left, right: array.length - 1, best, variables: vars(true), counters: { entered, left: exited }, result: `Longest length ${length}` });
  return steps;
}

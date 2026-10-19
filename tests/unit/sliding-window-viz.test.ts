import { describe, expect, it } from "vitest";
import { slidingWindow } from "@/lib/viz/sliding-window";
import { parseVizBlock, validateInput } from "@/lib/viz/parse";

function* lists(count: number, low: number, high: number, maxLength = 12) {
  let seed = 7_202_610;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
  for (let c = 0; c < count; c++) {
    const length = next() % (maxLength + 1);
    yield Array.from({ length }, () => low + (next() % (high - low + 1)));
  }
}

// Independent brute-force oracles: every contiguous window is examined directly.
const sum = (a: number[], i: number, j: number) => a.slice(i, j + 1).reduce((s, v) => s + v, 0);
function bestFixed(a: number[], k: number) {
  let best = -Infinity;
  for (let i = 0; i + k <= a.length; i++) best = Math.max(best, sum(a, i, i + k - 1));
  return best;
}
function shortestReaching(a: number[], target: number) {
  let best = 0;
  for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (sum(a, i, j) >= target && (best === 0 || j - i + 1 < best)) best = j - i + 1;
  return best;
}
function longestDistinct(a: number[]) {
  let best = 0;
  for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (new Set(a.slice(i, j + 1)).size === j - i + 1) best = Math.max(best, j - i + 1);
  return best;
}

describe("sliding-window visualizer", () => {
  it("fixed windows match the brute-force best sum, including negative values, with linear updates", () => {
    for (const list of lists(300, -9, 9)) {
      for (let k = 1; k <= list.length; k++) {
        const last = slidingWindow.trace({ array: list, target: k, mode: "fixed" }).at(-1)!;
        expect(last.result).toBe(`Best sum ${bestFixed(list, k)}`);
        expect(last.counters).toEqual({ additions: list.length, removals: list.length - k });
        const [l, r] = String(last.variables["best window"]).match(/\d+/g)!.map(Number);
        expect(r! - l! + 1).toBe(k);
        expect(sum(list, l!, r!)).toBe(bestFixed(list, k));
      }
    }
  });

  it("shortest windows match brute force on nonnegative values, each index entering once and leaving at most once", () => {
    for (const list of lists(400, 0, 9)) {
      for (const target of [1, 5, 12, 40]) {
        const steps = slidingWindow.trace({ array: list, target, mode: "shortest" });
        const last = steps.at(-1)!;
        const expected = shortestReaching(list, target);
        expect(last.result).toBe(expected ? `Shortest length ${expected}` : "No window");
        expect(last.counters.entered).toBe(list.length);
        expect(last.counters.left).toBeLessThanOrEqual(list.length);
        for (const step of steps) if (step.variables.valid === "yes") expect(Number(step.variables["window sum"])).toBeGreaterThanOrEqual(target);
      }
    }
  });

  it("longest distinct windows match brute force and keep the frequency map consistent with the window", () => {
    for (const list of lists(400, 0, 5)) {
      const steps = slidingWindow.trace({ array: list, mode: "longest-distinct" });
      expect(steps.at(-1)!.result).toBe(`Longest length ${longestDistinct(list)}`);
      for (const step of steps) {
        const { left, right } = step.pointers;
        if (left === undefined || right === undefined || right < left) continue;
        const counts = new Map<number, number>();
        for (const v of list.slice(left, right + 1)) counts.set(v, (counts.get(v) ?? 0) + 1);
        const shown = String(step.variables.counts);
        for (const [value, count] of counts) expect(shown, JSON.stringify({ list, step: step.explanation })).toContain(`${value}: ${count}`);
      }
    }
  });

  it("marks the best window as found on the final step and keeps snapshots detached", () => {
    const last = slidingWindow.trace({ array: [2, 1, 5, 1, 3, 2], target: 3, mode: "fixed" }).at(-1)!;
    expect(last.roles).toEqual(["discarded", "discarded", "found", "found", "found", "candidate"].map((role, i) => (i >= 2 && i <= 4 ? "found" : role)));
    const steps = slidingWindow.trace({ array: [1, 2], mode: "longest-distinct" });
    steps[0]!.variables.counts = "changed";
    expect(slidingWindow.trace({ array: [1, 2], mode: "longest-distinct" })[0]!.variables.counts).toBe("{}");
  });

  it("enforces each mode's preconditions, including nonnegative values for shortest windows", () => {
    expect(validateInput(slidingWindow, "2, -1, 3", "2", { mode: "fixed" })).toEqual({ ok: true, value: { array: [2, -1, 3], mode: "fixed", target: 2 } });
    expect(validateInput(slidingWindow, "2, 1", "3", { mode: "fixed" })).toMatchObject({ ok: false, error: expect.stringContaining("between 1 and the list length") });
    expect(validateInput(slidingWindow, "2, -1, 3", "4", { mode: "shortest" })).toMatchObject({ ok: false, error: expect.stringContaining("nonnegative") });
    expect(validateInput(slidingWindow, "2, 1", "0", { mode: "shortest" })).toMatchObject({ ok: false, error: expect.stringContaining("at least 1") });
    expect(validateInput(slidingWindow, "3, 3", "", { mode: "longest-distinct" })).toEqual({ ok: true, value: { array: [3, 3], mode: "longest-distinct" } });
    expect(validateInput(slidingWindow, "1", "k", { mode: "fixed" })).toMatchObject({ ok: false, error: expect.stringContaining("Window size k") });
    const block = parseVizBlock("algorithm: sliding-window\nmode: shortest\ninput: 2, 3, 1, 2, 4, 3\ntarget: 7");
    expect(block.ok && block.value.input).toEqual({ array: [2, 3, 1, 2, 4, 3], mode: "shortest", target: 7 });
    expect(() => slidingWindow.trace({ array: [1, -2], target: 1, mode: "shortest" })).toThrow(RangeError);
  });
});

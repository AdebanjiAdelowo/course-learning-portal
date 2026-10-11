import { describe, expect, it } from "vitest";

import { registry } from "@/lib/viz/algorithms";
import { parseArray, parseVizBlock, validateInput } from "@/lib/viz/parse";
import type { VizStep } from "@/lib/viz/types";

const linear = registry["linear-search"]!;
const binary = registry["binary-search"]!;
const insertion = registry["insertion-sort"]!;

const last = (steps: VizStep[]) => steps[steps.length - 1]!;

/** Deterministic pseudo-random lists, so the tests need no seed management. */
function* lists(count: number, maxLength: number, range: number): Generator<number[]> {
  let state = 12345;
  const next = () => (state = (state * 1103515245 + 12345) % 2147483648);
  for (let k = 0; k < count; k++) {
    const length = next() % (maxLength + 1);
    yield Array.from({ length }, () => (next() % range) - Math.floor(range / 2));
  }
}

function wellFormed(steps: VizStep[], pseudocodeLength: number) {
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) {
    expect(step.roles).toHaveLength(step.array.length);
    expect(step.explanation.length).toBeGreaterThan(10);
    if (step.line !== null) {
      expect(step.line).toBeGreaterThanOrEqual(0);
      expect(step.line).toBeLessThan(pseudocodeLength);
    }
  }
  // Exactly one result, on the final step.
  expect(steps.filter((s) => s.result !== undefined)).toEqual([last(steps)]);
}

describe("linear search tracer", () => {
  it("agrees with indexOf on every input and counts comparisons exactly", () => {
    for (const array of lists(200, 10, 9)) {
      for (const target of [-4, -1, 0, 2, 4, 50]) {
        const steps = linear.trace({ array, target });
        wellFormed(steps, linear.pseudocode.length);
        const index = array.indexOf(target);
        expect(last(steps).result).toBe(index === -1 ? "Not found" : `Found at index ${index}`);
        expect(last(steps).counters.comparisons).toBe(index === -1 ? array.length : index + 1);
      }
    }
  });

  it("never mutates its input and snapshots each step", () => {
    const array = [5, 1, 4];
    const steps = linear.trace({ array, target: 4 });
    expect(array).toEqual([5, 1, 4]);
    expect(new Set(steps.map((s) => s.array)).size).toBe(steps.length);
  });
});

describe("binary search tracer", () => {
  it("finds exactly the targets that are present, within the proven iteration bound", () => {
    for (const unsorted of lists(200, 12, 15)) {
      const array = [...unsorted].sort((a, b) => a - b);
      for (let target = -9; target <= 9; target++) {
        const steps = binary.trace({ array, target });
        wellFormed(steps, binary.pseudocode.length);
        const final = last(steps);
        if (array.includes(target)) {
          const index = Number(/index (\d+)/.exec(final.result!)![1]);
          expect(array[index]).toBe(target);
        } else {
          expect(final.result).toBe("Not found");
        }
        const bound = array.length === 0 ? 0 : Math.floor(Math.log2(array.length)) + 1;
        expect(final.counters.iterations).toBeLessThanOrEqual(bound);
      }
    }
  });

  it("maintains the invariant shown to students: the target is never in a discarded cell", () => {
    const array = [3, 8, 12, 17, 23, 31, 42, 56, 64, 71];
    for (const target of array) {
      for (const step of binary.trace({ array, target })) {
        step.roles.forEach((role, index) => {
          if (role === "discarded") expect(array[index]).not.toBe(target);
        });
      }
    }
  });

  it("at least halves the candidate range on every iteration", () => {
    const array = Array.from({ length: 12 }, (_, i) => i * 3);
    const sizes = binary
      .trace({ array, target: 100 })
      .filter((s) => s.line === 7 || s.line === 9)
      .map((s) => s.counters["range size"]!);
    let previous = array.length;
    for (const size of sizes) {
      expect(size).toBeLessThanOrEqual(Math.floor(previous / 2));
      previous = size;
    }
  });

  it("handles the empty list and a single element", () => {
    expect(last(binary.trace({ array: [], target: 1 })).result).toBe("Not found");
    expect(last(binary.trace({ array: [7], target: 7 })).result).toBe("Found at index 0");
    expect(last(binary.trace({ array: [7], target: 8 })).result).toBe("Not found");
  });
});

describe("insertion sort tracer", () => {
  const inversions = (a: number[]) => {
    let count = 0;
    for (let p = 0; p < a.length; p++) for (let q = p + 1; q < a.length; q++) if (a[p]! > a[q]!) count++;
    return count;
  };

  it("sorts every input, and its shift count equals the number of inversions", () => {
    for (const array of lists(300, 9, 7)) {
      const steps = insertion.trace({ array });
      wellFormed(steps, insertion.pseudocode.length);
      const final = last(steps);
      expect(final.array).toEqual([...array].sort((a, b) => a - b));
      expect(final.counters.shifts).toBe(inversions(array));
      expect(final.counters.comparisons).toBeLessThanOrEqual(inversions(array) + Math.max(0, array.length - 1));
    }
  });

  it("matches the best-case and worst-case counts derived in the lesson", () => {
    for (let n = 2; n <= 12; n++) {
      const sorted = Array.from({ length: n }, (_, i) => i);
      expect(last(insertion.trace({ array: sorted })).counters).toEqual({ comparisons: n - 1, shifts: 0 });
      const reversed = [...sorted].reverse();
      expect(last(insertion.trace({ array: reversed })).counters).toEqual({ comparisons: (n * (n - 1)) / 2, shifts: (n * (n - 1)) / 2 });
    }
  });

  it("keeps every step a rearrangement of the input, with at most one empty slot", () => {
    const array = [31, 12, 45, 8, 27, 19];
    for (const step of insertion.trace({ array })) {
      const holes = step.array.filter((v) => v === null).length;
      expect(holes).toBeLessThanOrEqual(1);
      const key = step.variables.key;
      const values = step.array.filter((v): v is number => v !== null);
      const shown = holes === 1 && typeof key === "number" ? [...values, key] : values;
      expect([...shown].sort((a, b) => a - b)).toEqual([...array].sort((a, b) => a - b));
    }
  });

  it("does not mutate the caller's array", () => {
    const array = [3, 1, 2];
    insertion.trace({ array });
    expect(array).toEqual([3, 1, 2]);
  });
});

describe("input parsing", () => {
  it("accepts commas or spaces and rejects anything that is not a small whole number", () => {
    expect(parseArray("3, 8,12  17")).toEqual({ ok: true, value: [3, 8, 12, 17] });
    expect(parseArray("")).toEqual({ ok: true, value: [] });
    expect(parseArray("3, x").ok).toBe(false);
    expect(parseArray("1.5").ok).toBe(false);
    expect(parseArray("1000").ok).toBe(false);
    expect(parseArray(Array(13).fill("1").join(",")).ok).toBe(false);
  });

  it("enforces an algorithm's precondition", () => {
    expect(validateInput(binary, "3, 1, 2", "1")).toMatchObject({ ok: false, error: expect.stringContaining("sorted") });
    expect(validateInput(binary, "1, 2, 2", "2").ok).toBe(true);
    expect(validateInput(binary, "1, 2", "").ok).toBe(false);
    expect(validateInput(insertion, "3, 1, 2", "").ok).toBe(true);
  });

  it("parses a viz block and reports author mistakes clearly", () => {
    const parsed = parseVizBlock("algorithm: binary-search\ninput: 1, 4, 9\ntarget: 4\n");
    expect(parsed.ok && parsed.value.algorithm.id).toBe("binary-search");
    expect(parsed.ok && parsed.value.input).toEqual({ array: [1, 4, 9], target: 4 });
    expect(parseVizBlock("input: 1, 2")).toMatchObject({ ok: false, error: expect.stringContaining("algorithm:") });
    expect(parseVizBlock("algorithm: bogo-sort")).toMatchObject({ ok: false, error: expect.stringContaining("Unknown algorithm") });
    expect(parseVizBlock("algorithm: binary-search\ninput: 2, 1\ntarget: 1").ok).toBe(false);
  });
});

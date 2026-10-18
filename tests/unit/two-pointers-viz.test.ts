import { describe, expect, it } from "vitest";
import { twoPointers } from "@/lib/viz/two-pointers";
import { parseVizBlock, validateInput } from "@/lib/viz/parse";

/** Deterministic pseudo-random sorted lists, so failures reproduce. */
function* sortedLists(count: number) {
  let seed = 20261018;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
  for (let c = 0; c < count; c++) {
    const length = next() % 13;
    yield Array.from({ length }, () => (next() % 21) - 8).sort((a, b) => a - b);
  }
}

const hasPair = (a: number[], target: number) => a.some((x, i) => a.some((y, j) => i < j && x + y === target));

describe("two-pointer visualizer", () => {
  it("finds a pair exactly when one exists, with a correct pair and at most n - 1 moves", () => {
    for (const list of sortedLists(400)) {
      for (const target of [-10, -3, 0, 4, 9, 30]) {
        const steps = twoPointers.trace({ array: list, target, mode: "opposite" });
        const last = steps.at(-1)!;
        const found = last.result!.match(/^Pair \((\d+), (\d+)\)$/);
        expect(Boolean(found), JSON.stringify({ list, target })).toBe(hasPair(list, target));
        if (found) {
          const [i, j] = [Number(found[1]), Number(found[2])];
          expect(i).toBeLessThan(j);
          expect(list[i]! + list[j]!).toBe(target);
          expect(last.roles[i]).toBe("found");
          expect(last.roles[j]).toBe("found");
        } else {
          expect(last.result).toBe("No pair");
        }
        expect(last.counters.moves).toBeLessThanOrEqual(Math.max(list.length - 1, 0));
      }
    }
  });

  it("never rules out an index that belongs to a valid pair", () => {
    for (const list of sortedLists(300)) {
      for (const target of [-4, 2, 7]) {
        for (const step of twoPointers.trace({ array: list, target, mode: "opposite" })) {
          step.roles.forEach((role, k) => {
            if (role !== "discarded") return;
            // A discarded index can only pair with other discarded indices for the target.
            const partners = list.map((value, j) => (j !== k && list[k]! + value === target ? j : -1)).filter((j) => j >= 0);
            for (const j of partners) expect(step.roles[j], JSON.stringify({ list, target, k })).toBe("discarded");
          });
        }
      }
    }
  });

  it("deduplicates a sorted list in place with one read per index and write never past read", () => {
    for (const list of sortedLists(400)) {
      const original = [...list];
      const steps = twoPointers.trace({ array: list, mode: "same" });
      const last = steps.at(-1)!;
      const distinct = [...new Set(list)];
      const kept = Number(last.variables.write);
      expect(kept).toBe(distinct.length);
      expect(last.array.slice(0, kept)).toEqual(distinct);
      expect(last.counters.reads).toBe(Math.max(list.length - 1, 0));
      expect(last.counters.writes).toBe(Math.max(distinct.length - 1, 0));
      for (const step of steps) if (step.pointers.read !== undefined) expect(step.pointers.write).toBeLessThanOrEqual(step.pointers.read + 1);
      expect(list).toEqual(original);
    }
  });

  it("records detached snapshots and handles empty and single-element lists", () => {
    const steps = twoPointers.trace({ array: [1, 1, 2], mode: "same" });
    steps[0]!.array[0] = 99;
    expect(twoPointers.trace({ array: [1, 1, 2], mode: "same" })[0]!.array[0]).toBe(1);
    expect(twoPointers.trace({ array: [], target: 3, mode: "opposite" }).at(-1)!.result).toBe("No pair");
    expect(twoPointers.trace({ array: [5], target: 10, mode: "opposite" }).at(-1)!.result).toBe("No pair");
    expect(twoPointers.trace({ array: [], mode: "same" }).at(-1)!.result).toBe("Kept 0 values");
  });

  it("validates mode, order and target through the shared parser", () => {
    expect(validateInput(twoPointers, "1, 3, 5", "8", { mode: "opposite" })).toEqual({ ok: true, value: { array: [1, 3, 5], mode: "opposite", target: 8 } });
    expect(validateInput(twoPointers, "1, 1, 2", "", { mode: "same" })).toEqual({ ok: true, value: { array: [1, 1, 2], mode: "same" } });
    expect(validateInput(twoPointers, "5, 1", "6", { mode: "opposite" })).toMatchObject({ ok: false, error: expect.stringContaining("sorted") });
    expect(validateInput(twoPointers, "1, 2", "x", { mode: "opposite" })).toMatchObject({ ok: false, error: expect.stringContaining("Target sum") });
    expect(validateInput(twoPointers, "1, 2", "3", { mode: "sideways" })).toMatchObject({ ok: false, error: expect.stringContaining("mode") });
    const block = parseVizBlock("algorithm: two-pointers\nmode: same\ninput: 2, 2, 4, 4, 4, 7");
    expect(block.ok && block.value.input).toEqual({ array: [2, 2, 4, 4, 4, 7], mode: "same" });
    const defaultMode = parseVizBlock("algorithm: two-pointers\ninput: 1, 4, 6, 9\ntarget: 10");
    expect(defaultMode.ok && defaultMode.value.input.mode).toBe("opposite");
    expect(() => twoPointers.trace({ array: [3, 1], target: 4, mode: "opposite" })).toThrow(RangeError);
  });
});

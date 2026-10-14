import { describe, expect, it } from "vitest";
import { dynamicArray, arrayOperations } from "@/lib/viz/dynamic-array";
import { parseVizBlock, validateInput } from "@/lib/viz/parse";

describe("dynamic-array teaching model", () => {
  it("copies only on full capacity and separates copies from insertion shifts", () => {
    const steps = dynamicArray.trace({ array: [2, 5, 9, 12], operation: "insert", index: 1, value: 7 });
    const last = steps.at(-1)!;
    expect(last.array).toEqual([2, 7, 5, 9, 12, null, null, null]);
    expect(last.variables).toMatchObject({ size: 5, capacity: 8 });
    expect(last.counters).toEqual({ reads: 7, writes: 8, shifts: 3, copies: 4 });
    const noResize = dynamicArray.trace({ array: [2, 5, 9], operation: "append", value: 7 }).at(-1)!;
    expect(noResize.array).toEqual([2, 5, 9, 7]);
    expect(noResize.counters).toMatchObject({ copies: 0, shifts: 0, writes: 1 });
  });
  it("agrees with independent array operations at every valid boundary", () => {
    for (let length = 0; length <= 12; length++) {
      const input = Array.from({ length }, (_, i) => i - 4);
      for (let index = 0; index <= length; index++) {
        const inserted = dynamicArray.trace({ array: input, operation: "insert", index, value: 99 }).at(-1)!;
        const expected = [...input]; expected.splice(index, 0, 99);
        expect(inserted.array.slice(0, Number(inserted.variables.size))).toEqual(expected);
        expect(inserted.counters.shifts).toBe(length - index);
        if (index < length) {
          const deleted = dynamicArray.trace({ array: input, operation: "delete", index }).at(-1)!;
          const expectedDeletion = [...input]; expectedDeletion.splice(index, 1);
          expect(deleted.array.slice(0, Number(deleted.variables.size))).toEqual(expectedDeletion);
          expect(deleted.counters.shifts).toBe(length - index - 1);
          expect(dynamicArray.trace({ array: input, operation: "access", index }).at(-1)!.result).toBe(`Value: ${input[index]}`);
        }
      }
      const traversal = dynamicArray.trace({ array: input, operation: "traverse" }).at(-1)!;
      expect(traversal.counters.reads).toBe(length);
      expect(input).toEqual(Array.from({ length }, (_, i) => i - 4));
    }
  });
  it("records deterministic detached snapshots, valid capacity and intermediate copies", () => {
    const input = { array: [4, 8], operation: "append" as const, value: 15 };
    const trace = dynamicArray.trace(input);
    expect(trace).toEqual(dynamicArray.trace(input));
    expect(trace.some(s => s.line === 2 && s.array.every(v => v === null))).toBe(true);
    expect(trace.some(s => s.counters.copies === 1 && s.array[0] === 4 && s.array[1] === null)).toBe(true);
    for (const state of trace) {
      expect(state.array).toHaveLength(Number(state.variables.capacity));
      expect(Number(state.variables.size)).toBeLessThanOrEqual(Number(state.variables.capacity));
      expect(state.roles).toHaveLength(state.array.length);
    }
    trace[0].array[0] = 999;
    expect(trace.at(-1)!.array[0]).toBe(4);
    expect(input.array).toEqual([4, 8]);
  });
  it("rejects invalid edits without modifying caller input and parses operation specifications", () => {
    const array = [1, 2];
    for (const index of [-1, 2, 3, 1.5]) expect(() => dynamicArray.trace({ array, operation: "delete", index })).toThrow();
    expect(() => dynamicArray.trace({ array: [], operation: "access", index: 0 })).toThrow();
    expect(array).toEqual([1, 2]);
    for (const operation of arrayOperations) {
      expect(validateInput(dynamicArray, "1,2", "", { operation, index: "1", value: "7" }).ok).toBe(true);
    }
    expect(validateInput(dynamicArray, "1", "", { operation: "insert", index: "2" }).ok).toBe(false);
    const parsed = parseVizBlock("algorithm: dynamic-array\ninput: 1, 2\noperation: insert\nindex: 1\nvalue: 7");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.input).toEqual({ array: [1, 2], operation: "insert", index: 1, value: 7 });
  });
});

import { describe, expect, it } from "vitest";
import { recursiveFactorial } from "@/lib/viz/recursion";
import { parseVizBlock } from "@/lib/viz/parse";

describe("factorial stack trace", () => {
  it("records actual calls, the base case, unwind values and exact costs", () => {
    const steps = recursiveFactorial.trace({ array: [], target: 4 });
    const returns = steps.filter(s => s.line === 3).map(s => s.frames!.at(-1)!.returned);
    expect(returns).toEqual([1, 2, 6, 24]);
    expect(Math.max(...steps.map(s => s.frames!.length))).toBe(5);
    expect(steps.find(s => s.line === 1)!.frames!.at(-1)).toEqual({ argument: 0, phase: "base", returned: 1 });
    expect(steps.at(-1)).toMatchObject({ frames: [], counters: { calls: 5, multiplications: 4 }, result: "factorial(4) = 24" });
  });
  it("handles zero without multiplying", () => {
    expect(recursiveFactorial.trace({ array: [], target: 0 }).at(-1)).toMatchObject({ counters: { calls: 1, multiplications: 0 }, result: "factorial(0) = 1" });
  });
  it("copies frames so moving backwards restores an earlier state", () => {
    const steps = recursiveFactorial.trace({ array: [], target: 2 });
    expect(steps[0]!.frames).toEqual([{ argument: 2, phase: "calling" }]);
    expect(steps[0]!.frames![0]).not.toBe(steps[1]!.frames![0]);
  });
  it("rejects inputs outside the bounded teaching model", () => {
    for (const target of [-1, 9, 1.5]) expect(() => recursiveFactorial.trace({ array: [], target })).toThrow();
    expect(parseVizBlock("algorithm: recursive-factorial\ntarget: 9").ok).toBe(false);
    expect(parseVizBlock("algorithm: recursive-factorial\ntarget: 4").ok).toBe(true);
  });
});

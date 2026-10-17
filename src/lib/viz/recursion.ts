import type { VizAlgorithm, VizStep } from "./types";

/** A deliberately bounded factorial trace: snapshots include pending and returning calls. */
export const recursiveFactorial: VizAlgorithm = {
  id: "recursive-factorial",
  title: "Recursive factorial",
  needsTarget: true,
  requiresSorted: false,
  pseudocode: ["factorial(n)", "    if n == 0: return 1", "    child = factorial(n - 1)", "    return n * child"],
  trace({ target = 4 }) {
    if (!Number.isInteger(target) || target < 0 || target > 8) throw new RangeError("Choose an integer from 0 to 8.");
    const steps: VizStep[] = [];
    const frames: NonNullable<VizStep["frames"]> = [];
    let calls = 0;
    let multiplications = 0;
    const capture = (line: number | null, explanation: string, result?: string) => {
      steps.push({ line, explanation, array: [], roles: [], pointers: {}, variables: { n: target, depth: frames.length },
        counters: { calls, multiplications }, frames: frames.map(frame => ({ ...frame })), ...(result ? { result } : {}) });
    };
    function visit(n: number): number {
      calls += 1;
      frames.push({ argument: n, phase: "calling" });
      capture(0, `Enter factorial(${n}). Its caller waits for this call to return.`);
      if (n === 0) {
        frames[frames.length - 1] = { argument: 0, phase: "base", returned: 1 };
        capture(1, "The base case returns 1 without making another call.");
        frames.pop();
        return 1;
      }
      capture(2, `Suspend factorial(${n}) while evaluating factorial(${n - 1}).`);
      const child = visit(n - 1);
      const returned = n * child;
      multiplications += 1;
      frames[frames.length - 1] = { argument: n, phase: "returning", returned };
      capture(3, `The child returned ${child}. Multiply ${n} by ${child}, then return ${returned}.`);
      frames.pop();
      return returned;
    }
    const result = visit(target);
    capture(null, "Every call has returned; the stack is empty.", `factorial(${target}) = ${result}`);
    return steps;
  },
};

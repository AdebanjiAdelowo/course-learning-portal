import { describe, expect, it } from "vitest";
import { linkedList } from "@/lib/viz/linked-list";
import { validateInput } from "@/lib/viz/parse";
import type { VizStep } from "@/lib/viz/types";

function sequence(step: VizStep) {
  const graph = step.linked!;
  const seen = new Set<string>();
  const values: number[] = [];
  let id = graph.head;
  while (id !== null) {
    expect(seen.has(id), "completed chains must be acyclic").toBe(false);
    seen.add(id);
    const node = graph.nodes.find(n => n.id === id)!;
    expect(node).toBeDefined();
    values.push(node.value);
    id = node.next;
  }
  expect(seen.size).toBe(graph.nodes.length);
  expect(graph.tail).toBe(graph.nodes.length ? [...seen].at(-1) : null);
  return values;
}

describe("linked pointer traces", () => {
  it("matches reference edits at every boundary, including empty and singleton chains", () => {
    for (let n = 0; n <= 12; n++) {
      const array = Array.from({ length: n }, (_, i) => i % 3);
      expect(sequence(linkedList.trace({ array, operation: "reverse" }).at(-1)!)).toEqual([...array].reverse());
      expect(sequence(linkedList.trace({ array, operation: "traverse" }).at(-1)!)).toEqual(array);
      expect(sequence(linkedList.trace({ array, operation: "append", value: 9 }).at(-1)!)).toEqual([...array, 9]);
      for (let index = 0; index <= n; index++) {
        expect(sequence(linkedList.trace({ array, operation: "insert", index, value: 9 }).at(-1)!)).toEqual([...array.slice(0, index), 9, ...array.slice(index)]);
        if (index < n) expect(sequence(linkedList.trace({ array, operation: "delete", index }).at(-1)!)).toEqual([...array.slice(0, index), ...array.slice(index + 1)]);
      }
    }
  });
  it("preserves identities and exposes saved successors and disconnected chains during reversal", () => {
    const trace = linkedList.trace({ array: [2, 5, 9], operation: "reverse" });
    const saved = trace.find(s => s.line === 2)!;
    expect(saved.linked!.markers).toMatchObject({ current: "N0", savedNext: "N1", previous: null });
    const changed = trace.find(s => s.line === 3)!;
    expect(changed.linked!.nodes[0].next).toBeNull();
    expect(changed.linked!.nodes[1].next).toBe("N2");
    expect(trace.at(-1)!.linked!.nodes.map(n => n.id)).toEqual(["N0", "N1", "N2"]);
    expect(trace.at(-1)!.counters).toEqual({ nextReads: 3, pointerWrites: 5 });
    for (const state of trace) {
      const ids = new Set(state.linked!.nodes.map(n => n.id));
      for (const node of state.linked!.nodes) if (node.next !== null) expect(ids.has(node.next)).toBe(true);
    }
  });
  it("uses constant tail append work and records detached snapshots without changing caller input", () => {
    const array = [1, 1, 2];
    const trace = linkedList.trace({ array, operation: "append", value: 7 });
    expect(trace.at(-1)!.counters).toEqual({ nextReads: 1, pointerWrites: 3 });
    expect(trace).toEqual(linkedList.trace({ array, operation: "append", value: 7 }));
    trace[0].linked!.nodes[0].value = 99;
    expect(trace.at(-1)!.linked!.nodes[0].value).toBe(1);
    expect(array).toEqual([1, 1, 2]);
  });
  it("rejects invalid operations before caller data can change", () => {
    const array = [4];
    expect(() => linkedList.trace({ array, operation: "delete", index: 1 })).toThrow();
    expect(() => linkedList.trace({ array: [], operation: "delete", index: 0 })).toThrow();
    expect(() => linkedList.trace({ array, operation: "insert", index: -1 })).toThrow();
    expect(validateInput(linkedList, "4", "", { operation: "reverse" }).ok).toBe(true);
    expect(validateInput(linkedList, "4", "", { operation: "access" }).ok).toBe(false);
    expect(array).toEqual([4]);
  });
});

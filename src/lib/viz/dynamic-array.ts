import type { VizAlgorithm, VizStep } from "./types";

export const arrayOperations = ["access", "traverse", "append", "insert", "delete"] as const;
export type ArrayOperation = typeof arrayOperations[number];

/** Teaching model: capacity doubles. This does not reproduce CPython allocation rules. */
export const dynamicArray: VizAlgorithm = {
  id: "dynamic-array",
  title: "Dynamic array operations",
  needsTarget: false,
  requiresSorted: false,
  operations: arrayOperations,
  pseudocode: ["validate operation and index", "read element or traverse logical elements", "if full: allocate twice the capacity", "copy each logical element to the new buffer", "shift elements to make or close a gap", "write value; update logical size"],
  trace({ array, operation = "append", index = 0, value = 7 }) {
    if (array.length > 12 || !array.every(Number.isSafeInteger)) throw new RangeError("Use at most 12 integers.");
    if (!arrayOperations.includes(operation) || !Number.isInteger(index) || !Number.isSafeInteger(value)) throw new RangeError("Invalid operation, index or value.");
    let size = array.length;
    if ((operation === "access" || operation === "delete") && (index < 0 || index >= size)) throw new RangeError("Index must refer to an existing element.");
    if (operation === "insert" && (index < 0 || index > size)) throw new RangeError("Insertion index must be between zero and size.");
    let capacity = 1;
    while (capacity < size) capacity *= 2;
    let buffer: (number | null)[] = [...array, ...Array(capacity - size).fill(null)];
    const steps: VizStep[] = [];
    let reads = 0, writes = 0, shifts = 0, copies = 0;
    const record = (line: number | null, explanation: string, active?: number, result?: string) => {
      steps.push({ line, explanation, array: [...buffer], roles: buffer.map((v, i) => i === active ? "active" : v === null ? "key" : "default"), pointers: active === undefined ? {} : { i: active }, variables: { size, capacity, operation }, counters: { reads, writes, shifts, copies }, ...(result ? { result } : {}) });
    };
    record(0, "Only indices below logical size hold elements. Empty slots are spare capacity.");
    if (operation === "access") {
      reads++;
      record(1, `Read index ${index} directly, without scanning preceding elements.`, index, `Value: ${buffer[index]}`);
      return steps;
    }
    if (operation === "traverse") {
      for (let i = 0; i < size; i++) { reads++; record(1, `Visit logical element ${i}; spare capacity is not traversed.`, i); }
      record(null, "Every logical element was visited once.", undefined, `Visited ${size} elements`);
      return steps;
    }
    if (operation === "delete") {
      for (let i = index; i < size - 1; i++) {
        buffer[i] = buffer[i + 1]; reads++; writes++; shifts++;
        record(4, `Move element ${i + 1} left to ${i}, closing the gap.`, i);
      }
      buffer[size - 1] = null; writes++; size--;
      record(5, "Clear the vacated final slot and decrease size. This model retains its capacity.", undefined, "Deletion complete");
      return steps;
    }
    if (size === capacity) {
      const old = buffer;
      capacity *= 2;
      buffer = Array(capacity).fill(null);
      record(2, "Allocate a buffer with twice the capacity. Old elements remain in the source buffer until copied.");
      for (let i = 0; i < size; i++) {
        buffer[i] = old[i]; reads++; writes++; copies++;
        record(3, `Copy source element ${i} into the new buffer.`, i);
      }
    }
    const at = operation === "append" ? size : index;
    for (let i = size; i > at; i--) {
      buffer[i] = buffer[i - 1]; reads++; writes++; shifts++;
      record(4, `Shift element ${i - 1} right to ${i}; right-to-left order avoids overwriting it.`, i);
    }
    buffer[at] = value; writes++; size++;
    record(5, `Write ${value} at index ${at} and increase size.`, at, `${operation === "append" ? "Append" : "Insertion"} complete`);
    return steps;
  },
};

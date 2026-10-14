import type { VizAlgorithm, VizStep } from "./types";

/** Nodes retain stable identities so intermediate, disconnected chains remain visible. */
export const linkedList: VizAlgorithm = {
  id: "linked-list",
  title: "Linked-list pointer operations",
  operations: ["traverse", "append", "insert", "delete", "reverse"],
  needsTarget: false,
  requiresSorted: false,
  pseudocode: ["validate operation and index", "follow next references to locate a node or predecessor", "save the successor before changing links", "set a node's next reference", "update head, tail or working references", "commit the resulting chain"],
  trace({ array, operation = "append", index = 0, value = 7 }) {
    if (array.length > 12 || !array.every(Number.isSafeInteger) || !Number.isSafeInteger(value)) throw new RangeError("Use at most 12 integer values.");
    if (!["traverse", "append", "insert", "delete", "reverse"].includes(operation)) throw new RangeError("Unsupported linked-list operation.");
    if (!Number.isInteger(index) || (operation === "insert" && (index < 0 || index > array.length)) || (operation === "delete" && (index < 0 || index >= array.length))) throw new RangeError("Invalid position for this operation.");
    type Node = { id: string; value: number; next: string | null };
    let nodes: Node[] = array.map((v, i) => ({ id: `N${i}`, value: v, next: i + 1 < array.length ? `N${i + 1}` : null }));
    let head: string | null = nodes[0]?.id ?? null;
    let tail: string | null = nodes.at(-1)?.id ?? null;
    let size = nodes.length, reads = 0, writes = 0;
    const markers: Record<string, string | null> = {};
    const steps: VizStep[] = [];
    const node = (id: string) => nodes.find(n => n.id === id)!;
    const record = (line: number | null, explanation: string, result?: string) => steps.push({ line, explanation, array: [], roles: [], pointers: {}, variables: { size, operation }, counters: { nextReads: reads, pointerWrites: writes }, linked: { nodes: nodes.map(n => ({ ...n })), head, tail, markers: { ...markers } }, ...(result ? { result } : {}) });
    record(0, "Boxes are node identities, not array indices or contiguous memory addresses. Arrows are next references.");
    if (operation === "traverse") {
      let current: string | null = head;
      while (current !== null) { markers.current = current; record(1, `Visit ${current}, whose value is ${node(current).value}.`); reads++; current = node(current).next; }
      markers.current = null;
      record(null, "The current reference reached null; traversal is complete.", `Visited ${size} nodes`);
      return steps;
    }
    if (operation === "reverse") {
      const oldHead = head;
      let current: string | null = head, previous: string | null = null;
      while (current !== null) {
        const next: string | null = node(current).next; reads++;
        Object.assign(markers, { current, previous, savedNext: next });
        record(2, "Save the successor so reversing this arrow does not lose the remaining chain.");
        node(current).next = previous; writes++;
        record(3, `Reverse ${current}.next toward ${previous ?? "null"}. Head/tail are committed after the loop.`);
        previous = current; current = next;
        Object.assign(markers, { current, previous, savedNext: null });
        record(4, "Advance the reversed-prefix and untouched-suffix references.");
      }
      head = previous; tail = oldHead; writes += 2;
      record(5, "Publish the reversed head and the original head as the new tail.", "Reversal complete");
      return steps;
    }
    const at = operation === "append" ? size : index;
    let predecessor: string | null = null;
    if (operation === "append") predecessor = tail;
    else if (at > 0) {
      predecessor = head;
      for (let i = 0; i < at - 1; i++) { markers.predecessor = predecessor; record(1, "Walk to the predecessor; locating an indexed position costs traversal."); reads++; predecessor = node(predecessor!).next; }
    }
    markers.predecessor = predecessor;
    if (operation === "delete") {
      const victim = predecessor === null ? head! : node(predecessor).next!;
      if (predecessor !== null) reads++;
      const successor = node(victim).next; reads++;
      Object.assign(markers, { victim, savedNext: successor });
      record(2, "Save the removed node's successor before rewiring the incoming reference.");
      if (predecessor === null) head = successor; else node(predecessor).next = successor;
      writes++;
      record(3, "Bypass the victim. Its detached box remains visible until the operation commits.");
      if (tail === victim) { tail = predecessor; writes++; }
      node(victim).next = null; writes++;
      record(4, "Repair tail when necessary and detach the victim's outgoing reference.");
      nodes = nodes.filter(n => n.id !== victim); delete markers.victim; size--;
      record(5, "The remaining chain keeps its original order.", "Deletion complete");
      return steps;
    }
    const successor = predecessor === null ? head : node(predecessor).next;
    if (predecessor !== null) reads++;
    const inserted = { id: `N${array.length}`, value, next: successor };
    nodes.push(inserted); writes++;
    Object.assign(markers, { newNode: inserted.id, savedNext: successor });
    record(3, "Allocate a detached node and connect its next reference to the saved successor first.");
    if (predecessor === null) head = inserted.id; else node(predecessor).next = inserted.id;
    writes++;
    record(4, "Connect the incoming head or predecessor reference to the new node.");
    if (successor === null) { tail = inserted.id; writes++; }
    size++;
    record(5, "Commit size and repair tail when inserting at the end.", operation === "append" ? "Append complete" : "Insertion complete");
    return steps;
  },
};

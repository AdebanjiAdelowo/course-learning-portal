/**
 * Algorithm visualization framework.
 *
 * A visualization is not an animation script. Each algorithm is implemented as a real tracer:
 * a pure function that runs the algorithm on the given input and records a `VizStep` every
 * time something worth explaining happens. The player only displays those recorded states, so
 * what a student sees is, by construction, what the algorithm does.
 *
 * To add an algorithm: write a tracer in `algorithms.ts`, register it in `registry`, and embed
 * it in a lesson with a fenced block:
 *
 *     ```viz
 *     algorithm: binary-search
 *     input: 3, 8, 12, 17
 *     target: 12
 *     ```
 */

/** How one array cell should be drawn in a step. */
export type CellRole =
  | "default"
  | "active" // being examined right now
  | "candidate" // still in the range under consideration
  | "discarded" // ruled out
  | "sorted" // part of the finished or sorted region
  | "key" // the value currently being placed
  | "found";

export type VizOperation = "access" | "traverse" | "append" | "insert" | "delete" | "reverse";

export interface VizStep {
  linked?: { nodes: { id: string; value: number; next: string | null }[]; head: string | null; tail: string | null; markers: Record<string, string | null> };
  /** Deterministic recursion frames, oldest call first. No student code is executed. */
  frames?: { argument: number; phase: "calling" | "base" | "returning"; returned?: number }[];
  /** Index into the algorithm's pseudocode lines, or null when no line is executing. */
  line: number | null;
  /** One or two sentences saying what just happened and why. */
  explanation: string;
  /** Array contents at this moment. `null` is an empty slot (a value lifted out as the key). */
  array: (number | null)[];
  /** Role of each cell; same length as `array`. */
  roles: CellRole[];
  /** Named index markers drawn under the array, such as lo, mid, hi. May point one past either end. */
  pointers: Record<string, number>;
  /** Current values of the algorithm's variables, shown beside the pseudocode. */
  variables: Record<string, string | number>;
  /** Running counts of the operations the analysis in the lesson talks about. */
  counters: Record<string, number>;
  /** Set on the final step. */
  result?: string;
}

export interface VizInput {
  /** Selected mode of an algorithm that declares `modes`. */
  mode?: string;
  operation?: VizOperation;
  index?: number;
  value?: number;
  array: number[];
  target?: number;
}

/**
 * One variant of an algorithm, chosen with a Mode control or a `mode:` line, for example
 * opposite-direction or same-direction pointers. A mode carries its own input preconditions.
 */
export interface VizMode {
  id: string;
  label: string;
  needsTarget: boolean;
  requiresSorted: boolean;
  /** Label of the numeric parameter, such as "Window size k". Defaults to "Target". */
  targetLabel?: string;
  /** Extra precondition check; returns an explanation when the input is not allowed. */
  validate?(array: readonly number[], target: number | undefined): string | null;
}

export interface VizAlgorithm {
  operations?: readonly VizOperation[];
  /** When present, the first mode is the default and its preconditions replace the fields below. */
  modes?: readonly VizMode[];
  id: string;
  title: string;
  pseudocode: string[];
  needsTarget: boolean;
  /** Binary search and friends are only meaningful on sorted input. */
  requiresSorted: boolean;
  trace(input: VizInput): VizStep[];
}

export const VIZ_LIMITS = { maxLength: 12, minValue: -99, maxValue: 999 } as const;

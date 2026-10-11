/**
 * The structured result of running Python in the browser. Everything here describes a local,
 * unofficial run: nothing in these types is evidence that a solution is correct, and none of
 * it is sent to the server.
 */

export interface PythonError {
  /** Exception class name, for example "NameError". */
  type: string;
  message: string;
  /** Line of the student's code where it happened, when known. */
  line: number | null;
  /** Traceback restricted to the student's own lines. */
  traceback: string;
}

export interface ProgramResult {
  kind: "program";
  status: "ok" | "error" | "output_limit";
  stdout: string;
  stderr: string;
  truncated: boolean;
  error: PythonError | null;
  durationMs: number;
}

export type TestStatus = "passed" | "failed" | "error" | "output_limit";

export interface TestCaseResult {
  index: number;
  status: TestStatus;
  /** The call as Python source, for example lower_bound([1, 3, 3], 3). */
  call: string;
  expected: string;
  /** repr of the returned value; null when the call raised or was stopped. */
  actual: string | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  error: PythonError | null;
  durationMs: number;
}

export interface TestsResult {
  kind: "tests";
  /** "error" means the code did not compile, so no test ran. */
  status: "ok" | "error";
  error: PythonError | null;
  results: TestCaseResult[];
}

export type PythonResult = ProgramResult | TestsResult;

/** A visible sample test: positional arguments and the expected return value, as JSON. */
export interface SampleTest {
  args: unknown[];
  expected: unknown;
}

export type PythonRequest =
  | { kind: "program"; code: string }
  | { kind: "tests"; code: string; functionName: string; tests: SampleTest[] };

/** What the page shows while and after running. */
export type RunPhase = "ready" | "loading" | "running";

export type RunOutcome =
  | { status: "completed"; result: PythonResult; durationMs: number }
  | { status: "timeout"; limitMs: number }
  | { status: "cancelled" }
  /** The runtime could not be downloaded or started. */
  | { status: "init_failed"; message: string }
  /** The worker died while running (for example, the browser ran out of memory). */
  | { status: "crashed"; message: string }
  /** Refused before running: another run is in progress, or the request is too large. */
  | { status: "rejected"; message: string };

/** Messages from the page to the worker. */
export interface WorkerRunMessage {
  type: "run";
  id: number;
  request: PythonRequest;
}

/** Messages from the worker to the page. */
export type WorkerMessage =
  | { type: "loading"; id: number }
  | { type: "started"; id: number }
  | { type: "result"; id: number; result: PythonResult }
  | { type: "init_failed"; id: number; message: string }
  | { type: "crashed"; id: number; message: string };

export const EXECUTION_LIMITS = {
  /** Wall-clock time allowed for the code itself, once the runtime is ready. */
  runTimeoutMs: 5_000,
  /** Time allowed for downloading and starting the runtime (about 13 MB on first use). */
  loadTimeoutMs: 90_000,
  maxCodeLength: 20_000,
  maxTests: 20,
  /** Size of one test's arguments and expected value, as JSON. */
  maxTestJsonLength: 20_000,
} as const;

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  allPassed: boolean;
}

export function summariseTests(result: TestsResult): TestSummary {
  const passed = result.results.filter((r) => r.status === "passed").length;
  const failed = result.results.filter((r) => r.status === "failed").length;
  const total = result.results.length;
  return { total, passed, failed, errors: total - passed - failed, allPassed: total > 0 && passed === total };
}

/** Checks a request against the input limits before it is sent to the worker. */
export function validateRequest(request: PythonRequest): string | null {
  if (request.code.trim() === "") return "Write some code first.";
  if (request.code.length > EXECUTION_LIMITS.maxCodeLength) {
    return `Code longer than ${EXECUTION_LIMITS.maxCodeLength.toLocaleString("en-GB")} characters cannot be run here.`;
  }
  if (request.kind === "tests") {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(request.functionName)) return "This problem has no function to call.";
    if (request.tests.length === 0) return "This problem has no sample tests to run.";
    if (request.tests.length > EXECUTION_LIMITS.maxTests) return "This problem has too many sample tests to run here.";
    for (const test of request.tests) {
      let size: number;
      try {
        size = JSON.stringify([test.args, test.expected]).length;
      } catch {
        return "A sample test could not be prepared.";
      }
      if (!Array.isArray(test.args) || size > EXECUTION_LIMITS.maxTestJsonLength) return "A sample test is too large to run here.";
    }
  }
  return null;
}

const explanations: Record<string, string> = {
  SyntaxError: "Python could not read this code. Check the marked line for a missing colon, bracket or quote.",
  IndentationError: "The indentation is inconsistent. Lines in the same block must start at the same column.",
  TabError: "This code mixes tabs and spaces for indentation. Use spaces only.",
  NameError: "A name is used before it has a value. Check the spelling, and that it is defined before this line runs.",
  TypeError: "An operation was applied to a value of the wrong type, or a function was called with the wrong number of arguments.",
  IndexError: "An index is outside the sequence. Valid indices of a list of length n run from 0 to n - 1.",
  KeyError: "A dictionary was asked for a key it does not contain.",
  ValueError: "A function received a value of the right type that it cannot use.",
  AssertionError: "An assert statement was false.",
  ZeroDivisionError: "The code divides by zero.",
  AttributeError: "A value does not have the attribute or method that was asked for. A common cause is a value that is None.",
  RecursionError: "The recursion went too deep. Check that every recursive call moves towards a base case.",
  UnboundLocalError: "A local variable is read before it is assigned inside this function.",
  RuntimeError: "The program stopped with a runtime error.",
};

/** One plain sentence to go with an exception, or null when the type is not a common one. */
export function explainError(error: Pick<PythonError, "type">): string | null {
  // The type name comes from the student's program (any class can be raised), so look it up
  // as an own property only: "constructor" must not find Object.prototype.constructor.
  return Object.hasOwn(explanations, error.type) ? (explanations[error.type] ?? null) : null;
}

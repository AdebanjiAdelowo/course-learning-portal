import { describe, expect, it } from "vitest";

import { PythonRunner, type WorkerLike } from "@/lib/python/controller";
import {
  EXECUTION_LIMITS,
  explainError,
  summariseTests,
  validateRequest,
  type ProgramResult,
  type PythonRequest,
  type TestsResult,
  type WorkerMessage,
  type WorkerRunMessage,
} from "@/lib/python/types";
import { buildWorkerContentSecurityPolicy, buildWorkerScript } from "@/lib/python/worker-script";

/** A stand-in worker: records what it is sent and lets the test reply by hand. */
class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: WorkerMessage }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  received: WorkerRunMessage[] = [];
  terminated = false;

  postMessage(message: WorkerRunMessage) {
    if (this.terminated) throw new Error("posted to a terminated worker");
    this.received.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(message: WorkerMessage) {
    this.onmessage?.({ data: message });
  }
  get lastId() {
    return this.received[this.received.length - 1]!.id;
  }
}

/** Timers under the test's control, so nothing waits in real time. */
function harness(options: { runTimeoutMs?: number; loadTimeoutMs?: number } = {}) {
  const workers: FakeWorker[] = [];
  const timers = new Map<number, { callback: () => void; ms: number }>();
  let nextTimer = 1;
  let clock = 0;
  const runner = new PythonRunner({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    setTimer: (callback, ms) => {
      timers.set(nextTimer, { callback, ms });
      return nextTimer++;
    },
    clearTimer: (handle) => void timers.delete(handle as number),
    now: () => clock,
    ...options,
  });
  return {
    runner,
    workers,
    timers,
    advance: (ms: number) => (clock += ms),
    /** Fires the single pending timer, as if its time had passed. */
    fireTimer: () => {
      expect(timers.size).toBe(1);
      const [[id, timer]] = [...timers];
      timers.delete(id!);
      timer!.callback();
    },
    worker: () => workers[workers.length - 1]!,
  };
}

const request: PythonRequest = { kind: "program", code: "print(1)\n" };
const ok: ProgramResult = { kind: "program", status: "ok", stdout: "1\n", stderr: "", truncated: false, error: null, durationMs: 0.2 };

describe("PythonRunner", () => {
  it("creates no worker until code is first run", () => {
    const h = harness();
    expect(h.workers).toHaveLength(0);
    expect(h.runner.getPhase()).toBe("ready");
  });

  it("moves through loading and running to a completed result", async () => {
    const h = harness();
    const phases: string[] = [];
    h.runner.subscribe(() => phases.push(h.runner.getPhase()));

    const pending = h.runner.run(request);
    expect(h.runner.getPhase()).toBe("loading");
    expect(h.worker().received).toEqual([{ type: "run", id: 1, request }]);

    h.worker().reply({ type: "loading", id: 1 });
    h.worker().reply({ type: "started", id: 1 });
    expect(h.runner.getPhase()).toBe("running");
    h.advance(12);
    h.worker().reply({ type: "result", id: 1, result: ok });

    expect(await pending).toEqual({ status: "completed", result: ok, durationMs: 12 });
    expect(phases).toEqual(["loading", "running", "ready"]);
    expect(h.timers.size).toBe(0);
    expect(h.worker().terminated).toBe(false);
  });

  it("reuses the same worker for later runs, so the runtime loads once", async () => {
    const h = harness();
    for (const id of [1, 2, 3]) {
      const pending = h.runner.run(request);
      h.worker().reply({ type: "started", id });
      h.worker().reply({ type: "result", id, result: ok });
      expect((await pending).status).toBe("completed");
    }
    expect(h.workers).toHaveLength(1);
    expect(h.worker().received.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("refuses a second run while one is in progress, without disturbing the first", async () => {
    const h = harness();
    const first = h.runner.run(request);
    const second = await h.runner.run(request);
    expect(second).toMatchObject({ status: "rejected" });
    expect(h.worker().received).toHaveLength(1);
    expect(h.runner.isBusy()).toBe(true);

    h.worker().reply({ type: "started", id: 1 });
    h.worker().reply({ type: "result", id: 1, result: ok });
    expect((await first).status).toBe("completed");
    expect(h.runner.isBusy()).toBe(false);
  });

  it("stops an endless program by terminating the worker when the time limit passes", async () => {
    const h = harness({ runTimeoutMs: 5000 });
    const pending = h.runner.run({ kind: "program", code: "while True:\n    pass\n" });
    h.worker().reply({ type: "started", id: 1 });
    expect([...h.timers.values()][0]!.ms).toBe(5000);

    h.fireTimer();
    expect(await pending).toEqual({ status: "timeout", limitMs: 5000 });
    expect(h.worker().terminated).toBe(true);
    expect(h.runner.getPhase()).toBe("ready");
  });

  it("starts a fresh worker for the run after a timeout", async () => {
    const h = harness();
    const first = h.runner.run(request);
    h.worker().reply({ type: "started", id: 1 });
    h.fireTimer();
    await first;

    const second = h.runner.run(request);
    expect(h.workers).toHaveLength(2);
    expect(h.workers[1]!.terminated).toBe(false);
    h.workers[1]!.reply({ type: "started", id: 2 });
    h.workers[1]!.reply({ type: "result", id: 2, result: ok });
    expect((await second).status).toBe("completed");
  });

  it("applies the execution limit only once the runtime is ready, and a longer one while loading", async () => {
    const h = harness({ runTimeoutMs: 5000, loadTimeoutMs: 90_000 });
    const pending = h.runner.run(request);
    expect([...h.timers.values()].map((t) => t.ms)).toEqual([90_000]);
    h.worker().reply({ type: "loading", id: 1 });
    expect([...h.timers.values()].map((t) => t.ms)).toEqual([90_000]);
    h.worker().reply({ type: "started", id: 1 });
    expect([...h.timers.values()].map((t) => t.ms)).toEqual([5000]);
    h.worker().reply({ type: "result", id: 1, result: ok });
    await pending;
  });

  it("reports a runtime that never loads, and discards the worker", async () => {
    const h = harness();
    const pending = h.runner.run(request);
    h.fireTimer();
    expect(await pending).toMatchObject({ status: "init_failed" });
    expect(h.worker().terminated).toBe(true);
  });

  it("cancels on request by terminating the worker, during loading or while running", async () => {
    const h = harness();
    const loading = h.runner.run(request);
    h.runner.cancel();
    expect(await loading).toEqual({ status: "cancelled" });
    expect(h.workers[0]!.terminated).toBe(true);

    const running = h.runner.run(request);
    h.workers[1]!.reply({ type: "started", id: 2 });
    h.runner.cancel();
    expect(await running).toEqual({ status: "cancelled" });
    expect(h.workers[1]!.terminated).toBe(true);
    expect(h.timers.size).toBe(0);
  });

  it("does nothing when asked to cancel with no run in progress", () => {
    const h = harness();
    h.runner.cancel();
    expect(h.workers).toHaveLength(0);
    expect(h.runner.getPhase()).toBe("ready");
  });

  it("ignores a late result from a worker that was already stopped", async () => {
    const h = harness();
    const first = h.runner.run(request);
    const stale = h.worker();
    stale.reply({ type: "started", id: 1 });
    h.runner.cancel();
    await first;

    const second = h.runner.run(request);
    // The terminated worker's handler was detached; even a forged late message changes nothing.
    stale.onmessage?.({ data: { type: "result", id: 2, result: ok } });
    expect(h.runner.isBusy()).toBe(true);
    h.workers[1]!.reply({ type: "result", id: 1, result: ok }); // wrong id: also ignored
    expect(h.runner.isBusy()).toBe(true);
    h.workers[1]!.reply({ type: "started", id: 2 });
    h.workers[1]!.reply({ type: "result", id: 2, result: ok });
    expect((await second).status).toBe("completed");
  });

  it("recovers from a worker that crashes while running", async () => {
    const h = harness();
    const pending = h.runner.run(request);
    h.worker().reply({ type: "started", id: 1 });
    h.worker().reply({ type: "crashed", id: 1, message: "RangeError: Maximum call stack size exceeded" });
    expect(await pending).toEqual({ status: "crashed", message: "RangeError: Maximum call stack size exceeded" });
    expect(h.worker().terminated).toBe(true);

    const next = h.runner.run(request);
    expect(h.workers).toHaveLength(2);
    h.workers[1]!.reply({ type: "started", id: 2 });
    h.workers[1]!.reply({ type: "result", id: 2, result: ok });
    expect((await next).status).toBe("completed");
  });

  it("treats a worker error before start-up as a failure to load, and after it as a crash", async () => {
    const h = harness();
    const loading = h.runner.run(request);
    h.worker().onerror?.({ message: "Failed to fetch the runtime" });
    expect(await loading).toEqual({ status: "init_failed", message: "Failed to fetch the runtime" });

    const running = h.runner.run(request);
    h.workers[1]!.reply({ type: "started", id: 2 });
    h.workers[1]!.onerror?.({});
    expect(await running).toMatchObject({ status: "crashed" });
    expect(h.workers.every((w) => w.terminated)).toBe(true);
  });

  it("reports a runtime that fails to initialise", async () => {
    const h = harness();
    const pending = h.runner.run(request);
    h.worker().reply({ type: "init_failed", id: 1, message: "WebAssembly is not available" });
    expect(await pending).toEqual({ status: "init_failed", message: "WebAssembly is not available" });
    expect(h.worker().terminated).toBe(true);
  });

  it("reports a browser that cannot create workers instead of throwing", async () => {
    const runner = new PythonRunner({
      createWorker: () => {
        throw new Error("Workers are disabled");
      },
    });
    expect(await runner.run(request)).toEqual({ status: "init_failed", message: "Workers are disabled" });
    expect(runner.isBusy()).toBe(false);
  });

  it("rejects an invalid request before creating a worker", async () => {
    const h = harness();
    expect(await h.runner.run({ kind: "program", code: "   \n" })).toMatchObject({ status: "rejected" });
    expect(await h.runner.run({ kind: "program", code: "x".repeat(EXECUTION_LIMITS.maxCodeLength + 1) })).toMatchObject({ status: "rejected" });
    expect(h.workers).toHaveLength(0);
  });

  it("releases the worker on dispose and cancels a run in progress", async () => {
    const h = harness();
    const pending = h.runner.run(request);
    h.runner.dispose();
    expect(await pending).toEqual({ status: "cancelled" });
    expect(h.worker().terminated).toBe(true);
    expect(h.timers.size).toBe(0);
  });

  it("stops notifying a listener that has unsubscribed", async () => {
    const h = harness();
    let calls = 0;
    const unsubscribe = h.runner.subscribe(() => calls++);
    const pending = h.runner.run(request);
    expect(calls).toBe(1);
    unsubscribe();
    h.runner.cancel();
    await pending;
    expect(calls).toBe(1);
  });
});

describe("request validation", () => {
  const test = { args: [[1, 2], 3], expected: 1 };

  it("accepts ordinary requests", () => {
    expect(validateRequest({ kind: "program", code: "print(1)" })).toBeNull();
    expect(validateRequest({ kind: "tests", code: "def f(): pass", functionName: "lower_bound", tests: [test] })).toBeNull();
  });

  it("enforces the code size limit at the boundary", () => {
    expect(validateRequest({ kind: "program", code: "x".repeat(EXECUTION_LIMITS.maxCodeLength) })).toBeNull();
    expect(validateRequest({ kind: "program", code: "x".repeat(EXECUTION_LIMITS.maxCodeLength + 1) })).not.toBeNull();
  });

  it("limits the number and the size of test cases", () => {
    const many = Array.from({ length: EXECUTION_LIMITS.maxTests + 1 }, () => test);
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: many })).not.toBeNull();
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: many.slice(1) })).toBeNull();
    const huge = { args: [Array.from({ length: 20_000 }, (_, i) => i)], expected: 0 };
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: [huge] })).not.toBeNull();
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: [] })).not.toBeNull();
  });

  it("refuses a function name that is not a plain identifier", () => {
    for (const functionName of ["", "a b", "f()", "__import__('os').system", "f;g", "1f"]) {
      expect(validateRequest({ kind: "tests", code: "x", functionName, tests: [test] })).not.toBeNull();
    }
  });

  it("refuses a test whose values cannot be serialised", () => {
    const circular: unknown[] = [];
    circular.push(circular);
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: [{ args: circular, expected: 0 }] })).not.toBeNull();
    expect(validateRequest({ kind: "tests", code: "x", functionName: "f", tests: [{ args: "not a list" as unknown as unknown[], expected: 0 }] })).not.toBeNull();
  });
});

describe("result helpers", () => {
  const result = (statuses: TestsResult["results"][number]["status"][]): TestsResult => ({
    kind: "tests",
    status: "ok",
    error: null,
    results: statuses.map((status, index) => ({
      index, status, call: "f()", expected: "1", actual: "1", stdout: "", stderr: "", truncated: false, error: null, durationMs: 1,
    })),
  });

  it("counts passed, failed and errored cases", () => {
    expect(summariseTests(result(["passed", "failed", "error", "output_limit", "passed"]))).toEqual({ total: 5, passed: 2, failed: 1, errors: 2, allPassed: false });
    expect(summariseTests(result(["passed", "passed"])).allPassed).toBe(true);
  });

  it("never reports 'all passed' when no test ran", () => {
    expect(summariseTests(result([]))).toEqual({ total: 0, passed: 0, failed: 0, errors: 0, allPassed: false });
  });

  it("explains the common exception types and stays silent on unknown ones", () => {
    for (const type of ["SyntaxError", "NameError", "TypeError", "IndexError", "ValueError", "AssertionError"]) {
      expect(explainError({ type })!.length).toBeGreaterThan(20);
    }
    expect(explainError({ type: "SomeCustomError" })).toBeNull();
    expect(explainError({ type: "constructor" })).toBeNull();
  });
});

describe("worker script and its policy", () => {
  const script = buildWorkerScript();

  it("loads the runtime only from this site", () => {
    expect(script).toContain('import { loadPyodide } from "/pyodide/pyodide.mjs"');
    expect(script).toContain('indexURL: "/pyodide/"');
    expect(script).not.toMatch(/https?:\/\//);
    expect(script).not.toMatch(/cdn\.|jsdelivr|unpkg/);
  });

  it("contains the harness as data, not as executable JavaScript", () => {
    expect(script).toContain("const HARNESS = \"");
    expect(script).toContain("handle_request");
    // The Python source cannot terminate the string it is embedded in.
    expect(() => new Function(script.replace(/^import .*$/m, "").replace("self.onmessage", "var _onmessage"))).not.toThrow();
  });

  it("confines the worker to the runtime folder and allows only WebAssembly compilation", () => {
    const policy = buildWorkerContentSecurityPolicy(["https://academy.example", "https://academy.example", "http://localhost:3000"]);
    expect(policy).toBe(
      "default-src 'none'; script-src https://academy.example/pyodide/ http://localhost:3000/pyodide/ 'wasm-unsafe-eval'; connect-src https://academy.example/pyodide/ http://localhost:3000/pyodide/",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("'self'");
    expect(policy).not.toContain("*");
  });
});

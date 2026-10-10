import {
  EXECUTION_LIMITS,
  validateRequest,
  type PythonRequest,
  type RunOutcome,
  type RunPhase,
  type WorkerMessage,
  type WorkerRunMessage,
} from "./types";

/** The part of a Web Worker the controller uses, so tests can supply a stand-in. */
export interface WorkerLike {
  postMessage(message: WorkerRunMessage): void;
  terminate(): void;
  onmessage: ((event: { data: WorkerMessage }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

export interface RunnerOptions {
  createWorker: () => WorkerLike;
  runTimeoutMs?: number;
  loadTimeoutMs?: number;
  /** Injected in tests. Defaults to the real timers. */
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
}

interface ActiveRun {
  id: number;
  resolve: (outcome: RunOutcome) => void;
  timer: unknown;
  startedAt: number | null;
}

/**
 * Runs Python requests on a worker, one at a time, and owns the worker's life cycle.
 *
 *   ready --run()--> loading --runtime up--> running --result--> ready
 *
 * A worker is created on the first run and reused, so the runtime is downloaded and started
 * once. It is destroyed, and a new one created on the next run, whenever a run does not end
 * normally: a timeout, a cancellation, a crash, or a failure to start. That is the only
 * reliable way to stop Python code that is in a loop, because the worker cannot process a
 * "stop" message while Python is running.
 *
 * This class knows nothing about React or the DOM.
 */
export class PythonRunner {
  private worker: WorkerLike | null = null;
  private active: ActiveRun | null = null;
  private nextId = 1;
  private phase: RunPhase = "ready";
  private readonly listeners = new Set<() => void>();
  private readonly options: Required<RunnerOptions>;

  constructor(options: RunnerOptions) {
    this.options = {
      runTimeoutMs: EXECUTION_LIMITS.runTimeoutMs,
      loadTimeoutMs: EXECUTION_LIMITS.loadTimeoutMs,
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      now: () => performance.now(),
      ...options,
    };
  }

  getPhase = (): RunPhase => this.phase;

  /** True while a run is loading or executing. A second run is refused until it ends. */
  isBusy(): boolean {
    return this.active !== null;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  run(request: PythonRequest): Promise<RunOutcome> {
    if (this.active) {
      return Promise.resolve({ status: "rejected", message: "Another program is still running. Stop it, or wait for it to finish." });
    }
    const problem = validateRequest(request);
    if (problem) return Promise.resolve({ status: "rejected", message: problem });

    return new Promise<RunOutcome>((resolve) => {
      const id = this.nextId++;
      let worker: WorkerLike;
      try {
        worker = this.ensureWorker();
      } catch (error) {
        resolve({ status: "init_failed", message: error instanceof Error ? error.message : String(error) });
        return;
      }
      this.active = {
        id,
        resolve,
        startedAt: null,
        timer: this.options.setTimer(
          () => this.finish(id, { status: "init_failed", message: "The Python runtime took too long to load. Check your connection and try again." }, true),
          this.options.loadTimeoutMs,
        ),
      };
      this.setPhase("loading");
      worker.postMessage({ type: "run", id, request });
    });
  }

  /** Stops the current run, if any, by terminating the worker. */
  cancel(): void {
    if (this.active) this.finish(this.active.id, { status: "cancelled" }, true);
  }

  /** Releases the worker. The runner can still be used afterwards. */
  dispose(): void {
    if (this.active) this.finish(this.active.id, { status: "cancelled" }, true);
    this.destroyWorker();
  }

  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const worker = this.options.createWorker();
    worker.onmessage = (event) => this.onMessage(worker, event.data);
    worker.onerror = (event) => {
      if (this.worker !== worker || !this.active) return;
      const run = this.active;
      const message = event.message || "The Python worker stopped unexpectedly.";
      // Before the runtime is up, an error means it could not be loaded at all.
      this.finish(run.id, run.startedAt === null ? { status: "init_failed", message } : { status: "crashed", message }, true);
    };
    this.worker = worker;
    return worker;
  }

  private onMessage(worker: WorkerLike, message: WorkerMessage): void {
    // Ignore anything from a worker that has been replaced, or about a run that is over.
    if (this.worker !== worker || !this.active || message.id !== this.active.id) return;
    const run = this.active;
    switch (message.type) {
      case "loading":
        return;
      case "started":
        // The runtime is ready: from here on the execution limit applies.
        this.options.clearTimer(run.timer);
        run.startedAt = this.options.now();
        run.timer = this.options.setTimer(
          () => this.finish(run.id, { status: "timeout", limitMs: this.options.runTimeoutMs }, true),
          this.options.runTimeoutMs,
        );
        this.setPhase("running");
        return;
      case "result":
        this.finish(run.id, { status: "completed", result: message.result, durationMs: this.options.now() - (run.startedAt ?? this.options.now()) }, false);
        return;
      case "init_failed":
        this.finish(run.id, { status: "init_failed", message: message.message }, true);
        return;
      case "crashed":
        this.finish(run.id, { status: "crashed", message: message.message }, true);
        return;
    }
  }

  private finish(id: number, outcome: RunOutcome, destroy: boolean): void {
    const run = this.active;
    if (!run || run.id !== id) return;
    this.options.clearTimer(run.timer);
    this.active = null;
    if (destroy) this.destroyWorker();
    this.setPhase("ready");
    run.resolve(outcome);
  }

  private destroyWorker(): void {
    const worker = this.worker;
    if (!worker) return;
    this.worker = null;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
  }

  private setPhase(phase: RunPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    for (const listener of this.listeners) listener();
  }
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

import { PythonRunner, type WorkerLike } from "./controller";
import { PYTHON_WORKER_PATH } from "./worker-script";
import type { PythonRequest, RunOutcome, RunPhase } from "./types";

let shared: PythonRunner | null = null;

/**
 * One runner, and so one worker and one copy of the runtime, for the whole page. Editors on
 * the same page (several runnable examples in a lesson) take turns using it.
 */
function getRunner(): PythonRunner {
  shared ??= new PythonRunner({
    createWorker: () => new Worker(PYTHON_WORKER_PATH, { type: "module", name: "python" }) as unknown as WorkerLike,
  });
  return shared;
}

const serverPhase = (): RunPhase => "ready";

export function usePythonRunner(): {
  /** State of the shared runner: it is "loading" or "running" whichever editor started it. */
  phase: RunPhase;
  run: (request: PythonRequest) => Promise<RunOutcome>;
  cancel: () => void;
} {
  const phase = useSyncExternalStore(
    (listener) => getRunner().subscribe(listener),
    () => getRunner().getPhase(),
    serverPhase,
  );
  const run = useCallback((request: PythonRequest) => getRunner().run(request), []);
  const cancel = useCallback(() => getRunner().cancel(), []);
  return { phase, run, cancel };
}

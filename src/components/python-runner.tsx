"use client";

import { CircleAlert, CircleCheck, CircleSlash, Clock, LoaderCircle, Play, Square, TimerOff } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import {
  explainError,
  summariseTests,
  type ProgramResult,
  type PythonError,
  type PythonRequest,
  type RunOutcome,
  type TestCaseResult,
  type TestsResult,
} from "@/lib/python/types";
import { usePythonRunner } from "@/lib/python/use-python-runner";

import { Button } from "./ui/button";

export type RunState = "ready" | "loading" | "running" | "completed" | "failed" | "timed_out" | "cancelled";

export const runStateLabels: Record<RunState, string> = {
  ready: "Ready",
  loading: "Loading runtime",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  timed_out: "Timed out",
  cancelled: "Cancelled",
};

/** The state to show for a finished run. "Completed" means it ran to the end without an error. */
export function outcomeState(outcome: RunOutcome): RunState {
  switch (outcome.status) {
    case "timeout":
      return "timed_out";
    case "cancelled":
      return "cancelled";
    case "completed":
      if (outcome.result.kind === "program") return outcome.result.status === "ok" ? "completed" : "failed";
      return outcome.result.status === "ok" && summariseTests(outcome.result).allPassed ? "completed" : "failed";
    default:
      return "failed";
  }
}

/**
 * Runs Python for one editor. The runtime is shared by every editor on the page, so this also
 * reports when another editor is using it.
 */
export function usePythonRun() {
  const { phase, run: runShared, cancel } = usePythonRunner();
  const [mine, setMine] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const run = useCallback(
    async (request: PythonRequest) => {
      setMine(true);
      setOutcome(null);
      const result = await runShared(request);
      setMine(false);
      setOutcome(result);
      return result;
    },
    [runShared],
  );

  const state: RunState = mine ? (phase === "running" ? "running" : "loading") : outcome ? outcomeState(outcome) : "ready";
  return {
    state,
    outcome,
    run,
    /** Stops this editor's run by terminating the worker. */
    stop: cancel,
    isRunning: mine,
    /** True while a different editor on the page is running code. */
    busyElsewhere: !mine && phase !== "ready",
    clear: () => setOutcome(null),
  };
}

const stateStyle: Record<RunState, string> = {
  ready: "border-line bg-sunken text-ink-soft",
  loading: "border-warn/25 bg-warn-soft text-warn",
  running: "border-accent/25 bg-accent-soft text-accent-strong",
  completed: "border-accent/25 bg-accent-soft text-accent-strong",
  failed: "border-danger/25 bg-danger-soft text-danger",
  timed_out: "border-danger/25 bg-danger-soft text-danger",
  cancelled: "border-line bg-sunken text-ink-soft",
};

const stateIcon = {
  ready: Clock,
  loading: LoaderCircle,
  running: LoaderCircle,
  completed: CircleCheck,
  failed: CircleAlert,
  timed_out: TimerOff,
  cancelled: CircleSlash,
} as const;

/** The current state as a badge. It is a live region, so a screen reader announces each change. */
export function RunStateBadge({ state }: { state: RunState }) {
  const Icon = stateIcon[state];
  return (
    <span
      role="status"
      aria-live="polite"
      data-run-state={state}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", stateStyle[state])}
    >
      <Icon className={cn("size-3.5", state === "loading" || state === "running" ? "animate-spin" : "")} aria-hidden="true" />
      {runStateLabels[state]}
    </span>
  );
}

/** Run and Stop. Stop is offered only while this editor's code is loading or running. */
export function RunButtons({
  runLabel,
  isRunning,
  disabled,
  onRun,
  onStop,
}: {
  runLabel: string;
  isRunning: boolean;
  disabled?: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  return (
    <>
      <Button onClick={onRun} disabled={isRunning || disabled}>
        <Play className="size-4" aria-hidden="true" />
        {runLabel}
      </Button>
      <Button variant="danger" onClick={onStop} disabled={!isRunning}>
        <Square className="size-4" aria-hidden="true" />
        Stop execution
      </Button>
    </>
  );
}

const formatMs = (ms: number) => (ms < 1 ? "under 1 ms" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

function Stream({ label, text, tone = "plain" }: { label: string; text: string; tone?: "plain" | "error" }) {
  if (text === "") return null;
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <pre
        tabIndex={0}
        aria-label={label}
        className={cn(
          "max-h-72 overflow-auto rounded-lg border border-line bg-sunken p-3 font-mono text-[0.82rem] leading-6 whitespace-pre-wrap",
          tone === "error" ? "text-danger" : "text-ink",
        )}
      >
        {text}
      </pre>
    </div>
  );
}

function ErrorBlock({ error }: { error: PythonError }) {
  const explanation = explainError(error);
  return (
    <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft p-3">
      <p className="font-semibold text-danger">
        {error.type}
        {error.line ? ` on line ${error.line}` : ""}
        {error.message ? `: ${error.message}` : ""}
      </p>
      {explanation ? <p className="mt-1 text-sm text-ink-soft">{explanation}</p> : null}
      {error.traceback ? (
        <pre tabIndex={0} aria-label="Traceback" className="mt-2 max-h-60 overflow-auto font-mono text-[0.8rem] leading-5 whitespace-pre-wrap text-ink">
          {error.traceback}
        </pre>
      ) : null}
    </div>
  );
}

function Truncated() {
  return <p className="text-sm text-ink-faint">The output was cut off: the program printed more than this panel keeps, and was stopped.</p>;
}

function ProgramOutput({ result }: { result: ProgramResult }) {
  const silent = result.stdout === "" && result.stderr === "" && !result.error;
  return (
    <div className="space-y-3">
      <Stream label="Standard output" text={result.stdout} />
      <Stream label="Standard error" text={result.stderr} tone="error" />
      {result.truncated ? <Truncated /> : null}
      {result.error ? <ErrorBlock error={result.error} /> : null}
      {silent ? <p className="text-ink-soft">The program finished without printing anything. Use print() to see a value.</p> : null}
      <p className="text-sm text-ink-faint">Execution time: {formatMs(result.durationMs)}</p>
    </div>
  );
}

const testLabel: Record<TestCaseResult["status"], string> = {
  passed: "Passed",
  failed: "Failed",
  error: "Error",
  output_limit: "Too much output",
};

function TestOutput({ result }: { result: TestsResult }) {
  if (result.status === "error" && result.error) {
    return (
      <div className="space-y-3">
        <p className="text-ink-soft">The code could not be read, so no sample test was run.</p>
        <ErrorBlock error={result.error} />
      </div>
    );
  }
  const summary = summariseTests(result);
  return (
    <div className="space-y-3">
      <p className="font-semibold" data-test-summary>
        {summary.passed} of {summary.total} sample {summary.total === 1 ? "test" : "tests"} passed
        {summary.failed > 0 ? `, ${summary.failed} failed` : ""}
        {summary.errors > 0 ? `, ${summary.errors} stopped with an error` : ""}.
      </p>
      <ol className="space-y-2.5">
        {result.results.map((test) => (
          <li key={test.index} data-test-status={test.status} className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken px-3 py-1.5">
              <p className="text-sm font-semibold">Sample test {test.index + 1}</p>
              <p className={cn("text-sm font-semibold", test.status === "passed" ? "text-accent-strong" : "text-danger")}>
                {testLabel[test.status]} <span className="font-normal text-ink-faint">· {formatMs(test.durationMs)}</span>
              </p>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 p-3 text-[0.86rem]">
              <dt className="text-ink-faint">Call</dt>
              <dd className="overflow-x-auto font-mono whitespace-pre">{test.call}</dd>
              <dt className="text-ink-faint">Expected</dt>
              <dd className="overflow-x-auto font-mono whitespace-pre">{test.expected}</dd>
              <dt className="text-ink-faint">Actual</dt>
              <dd className={cn("overflow-x-auto font-mono whitespace-pre", test.status === "failed" ? "font-semibold text-danger" : "")}>
                {test.actual ?? "(no value returned)"}
              </dd>
            </dl>
            {test.stdout || test.stderr || test.error || test.truncated ? (
              <div className="space-y-2.5 border-t border-line p-3">
                <Stream label="Printed output" text={test.stdout} />
                <Stream label="Standard error" text={test.stderr} tone="error" />
                {test.truncated ? <Truncated /> : null}
                {test.error ? <ErrorBlock error={test.error} /> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Everything a run produced, or why it produced nothing. `idle` is shown before the first run.
 */
export function PythonOutput({ state, outcome, idle }: { state: RunState; outcome: RunOutcome | null; idle: ReactNode }) {
  let body: ReactNode;
  if (state === "loading") {
    body = <p className="text-ink-soft">Loading the Python runtime. The first run downloads about 13 MB; later runs start at once.</p>;
  } else if (state === "running") {
    body = <p className="text-ink-soft">Running. Use Stop execution if it does not finish.</p>;
  } else if (!outcome) {
    body = <div className="text-ink-soft">{idle}</div>;
  } else if (outcome.status === "completed") {
    body = outcome.result.kind === "program" ? <ProgramOutput result={outcome.result} /> : <TestOutput result={outcome.result} />;
  } else if (outcome.status === "timeout") {
    body = (
      <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft p-3">
        <p className="font-semibold text-danger">Stopped after {outcome.limitMs / 1000} seconds.</p>
        <p className="mt-1 text-sm text-ink-soft">
          The program did not finish in time, so it was stopped. The usual cause is a loop whose condition never becomes false, or a
          recursion that never reaches its base case. Check what changes on each pass.
        </p>
      </div>
    );
  } else if (outcome.status === "cancelled") {
    body = <p className="text-ink-soft">Stopped at your request. Nothing was changed; you can run the code again.</p>;
  } else {
    body = (
      <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft p-3">
        <p className="font-semibold text-danger">
          {outcome.status === "init_failed"
            ? "The Python runtime could not be started."
            : outcome.status === "crashed"
              ? "The Python runtime stopped unexpectedly."
              : "The code was not run."}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{outcome.message}</p>
        {outcome.status === "crashed" ? (
          <p className="mt-1 text-sm text-ink-soft">
            This can happen when a program uses more memory than the browser allows, or recurses very deeply. The runtime restarts on the
            next run.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section aria-label="Output" className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Output</h3>
        <RunStateBadge state={state} />
      </header>
      <div className="p-4" data-python-output>
        {body}
      </div>
    </section>
  );
}

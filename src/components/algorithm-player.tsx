"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { registry } from "@/lib/viz/algorithms";
import { validateInput } from "@/lib/viz/parse";
import { VIZ_LIMITS, type CellRole, type VizInput } from "@/lib/viz/types";

const cellStyles: Record<CellRole, string> = {
  default: "border-line-strong bg-surface text-ink",
  active: "border-clay bg-clay-soft text-ink ring-2 ring-clay/40",
  candidate: "border-accent/50 bg-accent-soft text-ink",
  discarded: "border-line bg-sunken text-ink-faint",
  sorted: "border-accent bg-accent-soft text-accent-strong",
  key: "border-dashed border-clay bg-paper text-ink-faint",
  found: "border-accent bg-accent text-on-accent",
};

const roleNames: Record<CellRole, string> = {
  default: "not yet examined",
  active: "being examined",
  candidate: "still a candidate",
  discarded: "ruled out",
  sorted: "in sorted position",
  key: "empty slot for the key",
  found: "found",
};

const speeds = [
  { label: "Slow", ms: 1800 },
  { label: "Normal", ms: 1000 },
  { label: "Fast", ms: 450 },
] as const;

const controlClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-ink-faint hover:bg-sunken disabled:opacity-45";

/**
 * Steps through a recorded run of a real algorithm (see `src/lib/viz`). Everything shown is a
 * state the algorithm actually passed through on the current input.
 */
export function AlgorithmPlayer({ algorithmId, initialInput }: { algorithmId: string; initialInput: VizInput }) {
  const algorithm = registry[algorithmId];
  const id = useId();
  const [input, setInput] = useState<VizInput>(initialInput);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(speeds[1].ms);
  const [arrayText, setArrayText] = useState(initialInput.array.join(", "));
  const [targetText, setTargetText] = useState(String(initialInput.target ?? ""));
  const [inputError, setInputError] = useState<string | null>(null);

  const steps = useMemo(() => (algorithm ? algorithm.trace(input) : []), [algorithm, input]);
  const lastIndex = steps.length - 1;
  const atEnd = index >= lastIndex;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= lastIndex) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, lastIndex]);

  if (!algorithm) return null;
  const step = steps[Math.min(index, lastIndex)];
  if (!step) return null;

  function restart() {
    setPlaying(false);
    setIndex(0);
  }

  function applyInput(event: React.FormEvent) {
    event.preventDefault();
    const parsed = validateInput(algorithm!, arrayText, targetText);
    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }
    setInputError(null);
    setInput(parsed.value);
    restart();
  }

  function sortInput() {
    const sorted = arrayText
      .split(/[\s,]+/)
      .filter((part) => /^-?\d+$/.test(part))
      .map(Number)
      .sort((a, b) => a - b);
    setArrayText(sorted.join(", "));
    setInputError(null);
  }

  // Pointers that share an index are stacked under the same cell; a pointer may also sit one
  // place before the start or after the end (for example hi = -1 or i = n).
  const pointerSlots = new Map<number, string[]>();
  for (const [name, position] of Object.entries(step.pointers)) {
    pointerSlots.set(position, [...(pointerSlots.get(position) ?? []), name]);
  }
  const hasBefore = pointerSlots.has(-1);
  const hasAfter = pointerSlots.has(step.array.length);

  return (
    <section aria-label={`Interactive visualization: ${algorithm.title}`} className="not-prose overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken px-4 py-2.5">
        <p className="eyebrow">Visualization · {algorithm.title}</p>
        {step.result ? <p className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent">{step.result}</p> : null}
      </header>

      {/* relative: the screen-reader labels inside are absolutely positioned, and must scroll with
          this strip instead of widening the page. */}
      {step.frames ? (
        <div className="border-t border-line p-4">
          <p className="eyebrow">Call stack · oldest call first</p>
          <ol aria-label="Call-stack frames" className="mt-2 space-y-2">
            {step.frames.map((frame, depth) => (
              <li key={depth} className="rounded-lg border border-line p-2 font-mono text-sm">
                factorial({frame.argument}) · {frame.phase}
                {frame.returned !== undefined ? ` · return ${frame.returned}` : " · waiting for a result"}
              </li>
            ))}
          </ol>
          {step.frames.length === 0 ? <p className="mt-2 text-sm">The stack is empty.</p> : null}
        </div>
      ) : null}
      <div className="relative overflow-x-auto px-4 pb-2 pt-5">
        {step.array.length === 0 ? (
          <p className="py-6 text-center text-ink-faint">The list is empty.</p>
        ) : (
          <ol className="mx-auto flex w-max gap-1.5" aria-label="Array contents">
            {hasBefore ? (
              <li className="flex w-9 flex-col items-center justify-end">
                <span className="mt-auto font-mono text-xs font-bold text-clay">{pointerSlots.get(-1)!.join(" ")}</span>
              </li>
            ) : null}
            {step.array.map((value, position) => {
              const role = step.roles[position] ?? "default";
              return (
                <li key={position} className="flex w-12 flex-col items-center sm:w-14">
                  <span className="font-mono text-[0.68rem] text-ink-faint" aria-hidden="true">
                    {position}
                  </span>
                  <span
                    className={cn(
                      "mt-1 flex h-12 w-full items-center justify-center rounded-lg border-2 font-mono text-base font-semibold tabular-nums sm:h-14",
                      cellStyles[role],
                    )}
                  >
                    {value ?? ""}
                    <span className="sr-only">
                      {value === null ? "empty" : ""} at index {position}, {roleNames[role]}
                    </span>
                  </span>
                  <span className="mt-1 h-5 font-mono text-xs font-bold text-clay">{pointerSlots.get(position)?.join(" ") ?? ""}</span>
                </li>
              );
            })}
            {hasAfter ? (
              <li className="flex w-9 flex-col items-center justify-end">
                <span className="mt-auto h-5 font-mono text-xs font-bold text-clay">{pointerSlots.get(step.array.length)!.join(" ")}</span>
              </li>
            ) : null}
          </ol>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="min-h-[4.5rem] text-[0.97rem] leading-relaxed sm:min-h-[3.25rem]" aria-live="polite" aria-atomic="true">
          {step.explanation}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <button type="button" className={controlClass} onClick={restart} disabled={index === 0}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </button>
        <button type="button" className={controlClass} onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)); }} disabled={index === 0}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          className={cn(controlClass, "min-w-24 border-accent bg-accent text-on-accent hover:border-accent-strong hover:bg-accent-strong")}
          onClick={() => {
            if (atEnd) setIndex(0);
            setPlaying((value) => !value);
          }}
        >
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {playing ? "Pause" : atEnd ? "Replay" : "Play"}
        </button>
        <button type="button" className={controlClass} onClick={() => { setPlaying(false); setIndex((i) => Math.min(lastIndex, i + 1)); }} disabled={atEnd}>
          Step
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <div className="flex-1" />
        <label htmlFor={`${id}-speed`} className="text-sm text-ink-soft">
          Speed
        </label>
        <select id={`${id}-speed`} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="field h-10 w-auto py-0 text-sm">
          {speeds.map((option) => (
            <option key={option.ms} value={option.ms}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
        <label htmlFor={`${id}-scrub`} className="shrink-0 text-sm tabular-nums text-ink-soft">
          Step {index + 1} of {steps.length}
        </label>
        <input
          id={`${id}-scrub`}
          type="range"
          min={0}
          max={lastIndex}
          value={index}
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
          className="w-full accent-(--accent)"
        />
      </div>

      <div className="grid border-t border-line md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="p-4">
          <p className="eyebrow mb-2">Pseudocode</p>
          <ol className="font-mono text-[0.82rem] leading-6">
            {algorithm.pseudocode.map((line, lineIndex) => {
              const current = step.line === lineIndex;
              return (
                <li
                  key={lineIndex}
                  aria-current={current ? "step" : undefined}
                  className={cn("flex gap-3 rounded px-2 whitespace-pre", current ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink-soft")}
                >
                  <span className="w-4 shrink-0 text-right text-ink-faint select-none" aria-hidden="true">
                    {lineIndex + 1}
                  </span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="border-t border-line p-4 md:border-l md:border-t-0">
          <p className="eyebrow mb-2">State</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono text-sm">
            {Object.entries(step.variables).map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-ink-faint">{name}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="eyebrow mb-2 mt-4">Cost so far</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            {Object.entries(step.counters).map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-ink-soft">{name}</dt>
                <dd className="font-mono font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <details className="border-t border-line">
        <summary className="px-4 py-3 text-sm font-semibold">Try your own input</summary>
        <form onSubmit={applyInput} className="space-y-3 border-t border-line px-4 py-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div>
              <label htmlFor={`${id}-array`} className="block text-sm font-semibold">
                List
              </label>
              <input
                id={`${id}-array`}
                value={arrayText}
                onChange={(event) => setArrayText(event.target.value)}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={`${id}-help`}
                className="field mt-1.5 font-mono text-sm"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {algorithm.needsTarget ? (
              <div>
                <label htmlFor={`${id}-target`} className="block text-sm font-semibold">
                  Target
                </label>
                <input
                  id={`${id}-target`}
                  value={targetText}
                  onChange={(event) => setTargetText(event.target.value)}
                  inputMode="numeric"
                  className="field mt-1.5 font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            ) : null}
          </div>
          <p id={`${id}-help`} className="text-sm text-ink-faint">
            Up to {VIZ_LIMITS.maxLength} whole numbers, separated by commas.
            {algorithm.requiresSorted ? " The list must be sorted." : ""}
          </p>
          {inputError ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {inputError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={cn(controlClass, "border-accent bg-accent text-on-accent hover:bg-accent-strong")}>
              Run on this input
            </button>
            {algorithm.requiresSorted ? (
              <button type="button" className={controlClass} onClick={sortInput}>
                Sort the list for me
              </button>
            ) : null}
          </div>
        </form>
      </details>
    </section>
  );
}

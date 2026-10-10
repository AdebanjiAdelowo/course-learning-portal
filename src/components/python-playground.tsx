"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";

import { CodeEditor } from "@/components/code-editor";
import { PythonOutput, RunButtons, usePythonRun } from "@/components/python-runner";
import { Button } from "@/components/ui/button";
import type { PlaygroundExample } from "@/lib/python/examples";
import { EXECUTION_LIMITS } from "@/lib/python/types";

export const LOCAL_RUN_NOTICE =
  "Python runs in your browser, on your own device. Nothing you run here is sent to the server, saved or graded.";

/**
 * A scratch editor with a set of starter programs. It is independent of the practice problems:
 * nothing typed here is stored anywhere.
 */
export function PythonPlayground({ examples }: { examples: PlaygroundExample[] }) {
  const id = useId();
  const [exampleId, setExampleId] = useState(examples[0]?.id ?? "");
  const example = examples.find((item) => item.id === exampleId) ?? examples[0];
  const [code, setCode] = useState(example?.code ?? "");
  const { state, outcome, run, stop, isRunning, clear } = usePythonRun();

  function choose(nextId: string) {
    const next = examples.find((item) => item.id === nextId);
    if (!next) return;
    if (code !== example?.code && code.trim() !== "" && !window.confirm("Replace what is in the editor with this example?")) return;
    setExampleId(next.id);
    setCode(next.code);
    clear();
  }

  function reset() {
    if (!example) return;
    if (code !== example.code && !window.confirm("Put the example back as it was? Your changes will be lost.")) return;
    setCode(example.code);
    clear();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="min-w-0 space-y-4">
        <div>
          <label htmlFor={`${id}-example`} className="block text-sm font-semibold">
            Example
          </label>
          <select id={`${id}-example`} value={exampleId} onChange={(event) => choose(event.target.value)} className="field mt-2">
            {examples.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          {example ? <p className="mt-2 text-ink-soft">{example.explanation}</p> : null}
        </div>

        <CodeEditor
          id={`${id}-code`}
          name="code"
          value={code}
          onChange={setCode}
          label="Python code"
          maxLength={EXECUTION_LIMITS.maxCodeLength}
          describedBy={`${id}-notice`}
        />

        <div className="flex flex-wrap items-center gap-3">
          <RunButtons runLabel="Run code" isRunning={isRunning} onRun={() => void run({ kind: "program", code })} onStop={stop} />
          <Button variant="ghost" onClick={reset} disabled={isRunning}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <p id={`${id}-notice`} className="text-sm text-ink-faint">
          {LOCAL_RUN_NOTICE} A program is stopped after {EXECUTION_LIMITS.runTimeoutMs / 1000} seconds.
        </p>
      </div>

      <div className="min-w-0">
        <PythonOutput state={state} outcome={outcome} idle="Press Run code to see what the program prints." />
      </div>
    </div>
  );
}

/**
 * A runnable example inside a lesson: the lesson's code in a small editor, with its output
 * underneath. Students can change the code and run it again without leaving the page.
 */
export function RunnableSnippet({ code: initial }: { code: string }) {
  const id = useId();
  const [code, setCode] = useState(initial);
  const { state, outcome, run, stop, isRunning, busyElsewhere, clear } = usePythonRun();
  const lines = Math.min(Math.max(initial.split("\n").length, 4), 22);

  return (
    <section aria-label="Runnable Python example" className="not-prose space-y-3 rounded-xl border border-line bg-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Try it · runs in your browser</p>
        {code !== initial ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCode(initial);
              clear();
            }}
            disabled={isRunning}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>
      <div style={{ ["--snippet-height" as string]: `${lines * 1.5 + 2}rem` }}>
        <CodeEditor
          id={`${id}-code`}
          name="code"
          value={code}
          onChange={setCode}
          label="Python example"
          maxLength={EXECUTION_LIMITS.maxCodeLength}
          heightClass="h-(--snippet-height)"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <RunButtons runLabel="Run code" isRunning={isRunning} disabled={busyElsewhere} onRun={() => void run({ kind: "program", code })} onStop={stop} />
        {busyElsewhere ? <p className="text-sm text-ink-faint">Another example on this page is running.</p> : null}
      </div>
      {state !== "ready" || outcome ? <PythonOutput state={state} outcome={outcome} idle={null} /> : null}
    </section>
  );
}

"use client";

import { History, Info, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { saveCode } from "@/app/learn/actions/practice";
import { CodeEditor } from "@/components/code-editor";
import { PythonOutput, RunButtons, usePythonRun } from "@/components/python-runner";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton, useServerForm } from "@/components/ui/form";
import { EDITORIAL_NOTICE, LOCAL_RESULTS_LABEL, PRACTICE_LIMITS, PRACTICE_NOTICE } from "@/lib/domain/practice";
import { summariseTests, type SampleTest } from "@/lib/python/types";

export interface AttemptView {
  id: string;
  number: number;
  code: string;
  submittedLabel: string;
}

/**
 * The coding side of a practice problem: the editor, running the visible sample tests in the
 * browser, the two ways of saving, and the history of submitted attempts.
 *
 * Running and saving are separate. Running happens entirely in the student's browser and its
 * results are never sent anywhere; saving stores the text of the code and nothing else. The
 * server never runs the code and never learns whether the sample tests passed.
 */
export function PracticeWorkspace({
  problemId,
  initialCode,
  starterCode,
  draftLabel,
  attempts,
  functionName,
  sampleTests,
}: {
  problemId: string;
  initialCode: string;
  starterCode: string;
  /** "Draft saved 3 Oct 2026, 14:20", or null when there is no draft. */
  draftLabel: string | null;
  attempts: AttemptView[];
  /** The function the sample tests call; null when the problem has no runnable sample tests. */
  functionName: string | null;
  sampleTests: SampleTest[];
}) {
  const id = useId();
  const python = usePythonRun();
  const canRun = functionName !== null && sampleTests.length > 0;
  const lastRun = python.outcome?.status === "completed" && python.outcome.result.kind === "tests" ? python.outcome.result : null;
  const lastSummary = lastRun && lastRun.status === "ok" ? summariseTests(lastRun) : null;

  const { state, pending, formProps } = useServerForm(saveCode);
  const [code, setCode] = useState(initialCode);
  // What was last sent to the server; once that request succeeds it is the saved version.
  const [sent, setSent] = useState<string | null>(null);

  const saved = state.status === "success" && sent !== null ? sent : initialCode;
  const dirty = code !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setSent(code);
    formProps.onSubmit(event);
  }

  function replaceCode(next: string, what: string) {
    if (code.trim() !== "" && code !== next && !window.confirm(`Replace what is in the editor with ${what}?`)) return;
    setCode(next);
  }

  const remaining = PRACTICE_LIMITS.maxCodeLength - code.length;

  return (
    <div className="space-y-6">
      <form {...formProps} onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="problem_id" value={problemId} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Your solution</h2>
          <Button variant="ghost" size="sm" onClick={() => replaceCode(starterCode, "the starter code")}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset to starter code
          </Button>
        </div>

        <CodeEditor
          id={`${id}-code`}
          name="code"
          value={code}
          onChange={setCode}
          label="Python solution"
          maxLength={PRACTICE_LIMITS.maxCodeLength}
          invalid={Boolean(state.fieldErrors?.code)}
          describedBy={`${id}-notice`}
        />
        {state.fieldErrors?.code ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.fieldErrors.code.join(" ")}
          </p>
        ) : null}
        {remaining < 2000 ? (
          <p className="text-sm text-ink-faint">{remaining.toLocaleString("en-GB")} characters left.</p>
        ) : null}

        <p id={`${id}-notice`} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <span>{PRACTICE_NOTICE}</span>
        </p>

        {canRun ? (
          <div className="space-y-3 rounded-xl border border-line bg-paper p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-3">
              <RunButtons
                runLabel="Run code"
                isRunning={python.isRunning}
                disabled={python.busyElsewhere}
                onRun={() => void python.run({ kind: "tests", code, functionName: functionName!, tests: sampleTests })}
                onStop={python.stop}
              />
              <p className="text-sm text-ink-faint">
                Runs the {sampleTests.length} sample {sampleTests.length === 1 ? "test" : "tests"} shown under Examples, in your browser.
              </p>
            </div>
            <p className="text-sm font-semibold">{LOCAL_RESULTS_LABEL}</p>
            <PythonOutput
              state={python.state}
              outcome={python.outcome}
              idle="Press Run code to call your function with each sample test and compare what it returns with the expected value."
            />
            {lastSummary ? (
              <p className="text-sm text-ink-soft">
                {lastSummary.allPassed
                  ? "Every sample test passed on your device. That is encouraging, not proof: the samples are a few cases, and passing them is not a grade. Think about empty input, a single element and the largest allowed values before you submit."
                  : "Not every sample test passed yet. You can keep working, or submit anyway and compare your approach with the editorial."}
              </p>
            ) : null}
          </div>
        ) : null}

        <FormMessage state={state} />

        <p className="text-sm text-ink-soft">
          {canRun ? "Run the sample tests before you submit. " : ""}
          {EDITORIAL_NOTICE}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending={pending} name="intent" value="submit" pendingLabel="Saving…">
            Submit for self-review
          </SubmitButton>
          <SubmitButton pending={pending} name="intent" value="save" variant="secondary" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
          <p className="text-sm text-ink-faint" aria-live="polite">
            {dirty ? "Unsaved changes" : (state.status === "success" ? "All changes saved" : (draftLabel ?? "No draft saved yet"))}
          </p>
        </div>
      </form>

      <section aria-labelledby={`${id}-history`}>
        <h2 id={`${id}-history`} className="flex items-center gap-2 text-xl font-semibold">
          <History className="size-5 text-accent" aria-hidden="true" />
          Submission history
        </h2>
        {attempts.length === 0 ? (
          <p className="mt-2 text-ink-soft">
            You have not submitted an attempt yet. Submitting records a copy of your code here and unlocks the editorial for
            self-review.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-faint">
              {attempts.length} of {PRACTICE_LIMITS.maxSubmissionsPerProblem} recorded attempts used. Attempts are kept as you
              submitted them. They are not graded: a recorded attempt says nothing about whether the code is correct.
            </p>
            <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                      <span className="font-semibold">Attempt {attempt.number}</span>
                      <span className="text-sm text-ink-faint">
                        {attempt.submittedLabel} · {attempt.code.split("\n").length} lines · not graded
                      </span>
                    </summary>
                    <div className="border-t border-line">
                      <pre tabIndex={0} className="max-h-80 overflow-auto bg-sunken p-4 font-mono text-[0.82rem] leading-6">
                        {attempt.code}
                      </pre>
                      <div className="border-t border-line px-4 py-2.5">
                        <Button variant="secondary" size="sm" onClick={() => replaceCode(attempt.code, `attempt ${attempt.number}`)}>
                          Load into the editor
                        </Button>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

/** Hints are revealed one at a time, in order, so a student takes only as much help as needed. */
export function HintList({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  if (hints.length === 0) return null;
  return (
    <div>
      {shown === 0 ? (
        <p className="text-ink-soft">
          {hints.length} {hints.length === 1 ? "hint is" : "hints are"} available, from a gentle nudge to nearly the whole idea. Try the
          problem first.
        </p>
      ) : (
        <ol className="space-y-3" aria-live="polite">
          {hints.slice(0, shown).map((hint, index) => (
            <li key={index} className="flex gap-3 rounded-lg border border-line bg-surface p-4">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
              <p>
                <span className="font-semibold">Hint {index + 1}. </span>
                {hint}
              </p>
            </li>
          ))}
        </ol>
      )}
      {shown < hints.length ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShown((value) => value + 1)}>
          <Lightbulb className="size-4" aria-hidden="true" />
          {shown === 0 ? "Show the first hint" : `Show hint ${shown + 1} of ${hints.length}`}
        </Button>
      ) : (
        <p className="mt-3 text-sm text-ink-faint">That was the last hint.</p>
      )}
    </div>
  );
}

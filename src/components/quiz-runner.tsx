"use client";

import { ArrowLeft, ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { submitQuiz } from "@/app/learn/actions/quiz";
import { cn } from "@/lib/cn";
import { isAnswered, type AnswerValue, type QuestionType } from "@/lib/domain/quiz";

import { Button } from "./ui/button";
import { ProgressBar } from "./ui/progress";

export interface RunnerQuestion {
  id: string;
  type: QuestionType;
  points: number;
  /** Prompt rendered on the server (Markdown, maths, code). */
  prompt: ReactNode;
  options: { id: string; label: ReactNode }[];
}

const typeHint: Record<QuestionType, string> = {
  multiple_choice: "Choose one answer.",
  multiple_select: "Choose every answer that applies.",
  true_false: "True or false?",
  short_answer: "Type a short answer.",
};

function ChoiceRow({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3.5 rounded-lg border px-4 py-3.5 transition-colors",
        checked ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-ink-faint",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="mt-1.5 size-4 shrink-0 accent-(--accent)" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

export function QuizRunner({ quizId, questions }: { quizId: string; questions: RunnerQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  // index === questions.length is the review step before submitting.
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const total = questions.length;
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const reviewing = index === total;
  const question = questions[index];

  // Move focus to the new question so keyboard and screen-reader users follow the step change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  // Warn before losing answers that have not been submitted.
  useEffect(() => {
    if (answeredCount === 0 || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [answeredCount, pending]);

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitQuiz({ quizId, answers });
      // On success the action redirects to the result page and never returns.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">{reviewing ? "Review your answers" : `Question ${index + 1} of ${total}`}</p>
        <p className="text-sm text-ink-faint tabular-nums">
          {answeredCount} of {total} answered
        </p>
      </div>
      <ProgressBar value={Math.round((100 * answeredCount) / total)} label="Questions answered" className="mt-3" />

      {question ? (
        <fieldset className="mt-7">
          <legend className="w-full">
            <h2 ref={headingRef} tabIndex={-1} className="font-sans text-lg font-semibold leading-relaxed outline-none">
              <span className="sr-only">Question {index + 1}: </span>
              {question.prompt}
            </h2>
            <p className="mt-2 text-sm text-ink-faint">
              {typeHint[question.type]} {question.points} {question.points === 1 ? "point" : "points"}.
            </p>
          </legend>

          <div className="mt-5 space-y-2.5">
            {question.type === "multiple_choice"
              ? question.options.map((option) => (
                  <ChoiceRow
                    key={option.id}
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswer(question.id, option.id)}
                  >
                    {option.label}
                  </ChoiceRow>
                ))
              : null}

            {question.type === "multiple_select"
              ? question.options.map((option) => {
                  const current = answers[question.id];
                  const selected = Array.isArray(current) ? current : [];
                  const checked = selected.includes(option.id);
                  return (
                    <ChoiceRow
                      key={option.id}
                      type="checkbox"
                      name={question.id}
                      checked={checked}
                      onChange={() =>
                        setAnswer(
                          question.id,
                          checked ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                        )
                      }
                    >
                      {option.label}
                    </ChoiceRow>
                  );
                })
              : null}

            {question.type === "true_false"
              ? [true, false].map((value) => (
                  <ChoiceRow
                    key={String(value)}
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === value}
                    onChange={() => setAnswer(question.id, value)}
                  >
                    {value ? "True" : "False"}
                  </ChoiceRow>
                ))
              : null}

            {question.type === "short_answer" ? (
              <div>
                <label htmlFor={`answer-${question.id}`} className="sr-only">
                  Your answer
                </label>
                <input
                  id={`answer-${question.id}`}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={500}
                  value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setIndex(index + 1);
                    }
                  }}
                  placeholder="Your answer"
                  className="field max-w-md"
                />
              </div>
            ) : null}
          </div>
        </fieldset>
      ) : (
        <div className="mt-7">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            Ready to submit?
          </h2>
          <p className="mt-2 text-ink-soft">
            {answeredCount === total
              ? "You have answered every question. You can still go back and change an answer."
              : `You have left ${total - answeredCount} ${total - answeredCount === 1 ? "question" : "questions"} unanswered. Unanswered questions score zero.`}
          </p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {questions.map((q, i) => {
              const done = isAnswered(answers[q.id]);
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className="flex w-full items-center justify-between rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-left text-sm font-semibold hover:border-ink-faint"
                  >
                    Question {i + 1}
                    <span className={done ? "text-accent" : "text-danger"}>{done ? "Answered" : "Not answered"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0 || pending}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        {reviewing ? (
          <Button onClick={submit} disabled={pending} aria-busy={pending} size="lg">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Grading…" : "Submit quiz"}
          </Button>
        ) : (
          <Button onClick={() => setIndex(index + 1)}>
            {index === total - 1
              ? "Review answers"
              : isAnswered(answers[question?.id ?? ""])
                ? "Save answer and continue"
                : "Skip for now"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

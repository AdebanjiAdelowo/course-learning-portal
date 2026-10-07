import { ArrowLeft, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import type { AnswerValue, StoredResult } from "@/lib/domain/quiz";
import { formatDateTime, formatScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quiz result" };

type Props = { params: Promise<{ slug: string; attemptId: string }> };

/** An answer in words. Option texts may contain LaTeX, so they go through the Markdown renderer. */
function Answer({ result, value }: { result: StoredResult; value: AnswerValue }) {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) return <>No answer</>;
  if (typeof value === "boolean") return <>{value ? "True" : "False"}</>;
  if (result.type === "short_answer") return <>{Array.isArray(value) ? value.join(" / ") : value}</>;

  const ids = Array.isArray(value) ? value : [value];
  return (
    <>
      {ids.map((id, index) => (
        <span key={id}>
          {index > 0 ? "; " : null}
          <Markdown className="inline text-[length:inherit] leading-[inherit] [&_p]:inline">
            {result.options.find((option) => option.id === id)?.text ?? id}
          </Markdown>
        </span>
      ))}
    </>
  );
}

export default async function AttemptPage({ params }: Props) {
  const { slug, attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();

  const viewer = await requireViewer();
  const { quizzes } = await requireCourseState();
  const quiz = quizzes.find((q) => q.slug === slug);
  if (!quiz) notFound();

  const supabase = await createClient();
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .select("id, attempt_number, score, max_score, percent, passed, submitted_at, results")
    .eq("id", attemptId)
    .eq("quiz_id", quiz.id)
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load this attempt: ${error.message}`);
  if (!attempt) notFound();

  const results = (attempt.results as unknown as StoredResult[]) ?? [];
  const percent = Number(attempt.percent);
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href={`/learn/quizzes/${quiz.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {quiz.title}
        </Link>
        <p className="eyebrow mt-5">
          Attempt {attempt.attempt_number} · {formatDateTime(attempt.submitted_at, viewer.profile.timezone)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Your result</h1>
      </header>

      <section aria-label="Score" className="card relative overflow-hidden p-6 sm:p-8">
        <div className={`absolute inset-y-0 left-0 w-1 ${attempt.passed ? "bg-accent" : "bg-danger"}`} aria-hidden="true" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-serif text-5xl font-semibold tabular-nums">{Math.round(percent)}%</p>
            <p className="mt-1 text-ink-soft">
              {formatScore(Number(attempt.score))} of {formatScore(Number(attempt.max_score))} points · {correctCount} of{" "}
              {results.length} questions correct
            </p>
          </div>
          {attempt.passed ? <Badge tone="accent" className="px-3 py-1 text-sm">Passed</Badge> : <Badge tone="danger" className="px-3 py-1 text-sm">Not passed</Badge>}
        </div>
        <ProgressBar value={percent} label="Score" className="mt-5" />
        <p className="mt-3 text-sm text-ink-faint">
          Pass mark {quiz.pass_percent}%.{" "}
          {attempt.passed
            ? "This quiz now counts towards your course completion."
            : "Read the explanations below, revisit the lessons if you need to, then try again."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={`/learn/quizzes/${quiz.slug}`} variant={attempt.passed ? "secondary" : "primary"}>
            {attempt.passed ? "Retake to improve" : "Try again"}
          </ButtonLink>
          <ButtonLink href="/learn" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="explanations" className="space-y-4">
        <h2 id="explanations" className="text-xl font-semibold">
          Answers and explanations
        </h2>
        <ol className="space-y-4">
          {results.map((result, index) => (
            <li key={result.questionId} className="card p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                    result.correct ? "bg-accent text-on-accent" : "bg-danger-soft text-danger"
                  }`}
                >
                  {result.correct ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                  <span className="sr-only">{result.correct ? "Correct" : "Incorrect"}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">
                    Question {index + 1} · {formatScore(result.earned)}/{formatScore(result.points)} points
                  </p>
                  <Markdown className="mt-1.5 font-semibold">{result.prompt}</Markdown>
                  <dl className="mt-4 space-y-2 text-[0.97rem]">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-faint">Your answer:</dt>
                      <dd className={result.correct ? "font-semibold text-accent" : "font-semibold text-danger"}>
                        <Answer result={result} value={result.given} />
                      </dd>
                    </div>
                    {result.correct ? null : (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-ink-faint">Correct answer:</dt>
                        <dd className="font-semibold"><Answer result={result} value={result.correctAnswer} /></dd>
                      </div>
                    )}
                  </dl>
                  {result.explanation ? (
                    <div className="mt-4 rounded-lg bg-sunken px-4 py-3">
                      <p className="eyebrow">Explanation</p>
                      <Markdown className="mt-1 text-[0.97rem] leading-relaxed">{result.explanation}</Markdown>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

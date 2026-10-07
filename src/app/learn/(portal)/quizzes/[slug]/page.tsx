import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { QuizRunner, type RunnerQuestion } from "@/components/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import type { QuizOption } from "@/lib/domain/quiz";
import { formatDateTime, formatScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { quizzes } = await requireCourseState();
  return { title: quizzes.find((q) => q.slug === slug)?.title ?? "Quiz" };
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const { quizzes, progress, attempts, record } = await requireCourseState();

  const quiz = quizzes.find((q) => q.slug === slug);
  const owner = quiz && progress.moduleProgress.find((m) => m.module.id === quiz.module_id);
  if (!quiz || !owner) notFound();

  const history = attempts.filter((a) => a.quiz_id === quiz.id);
  const standing = record.quizStandings.get(quiz.id);
  const attemptsLeft = quiz.max_attempts === null ? null : Math.max(0, quiz.max_attempts - history.length);
  const locked = owner.state === "locked";

  let questions: RunnerQuestion[] = [];
  if (!locked && attemptsLeft !== 0) {
    const supabase = await createClient();
    // Answer keys live in a table students cannot read; only the questions are fetched here.
    const { data, error } = await supabase
      .from("questions")
      .select("id, position, type, prompt_md, options, points")
      .eq("quiz_id", quiz.id)
      .order("position");
    if (error) throw new Error(`Could not load this quiz: ${error.message}`);
    questions = data.map((question) => ({
      id: question.id,
      type: question.type,
      points: question.points,
      prompt: <Markdown className="[&_p]:inline">{question.prompt_md}</Markdown>,
      options: ((question.options as unknown as QuizOption[]) ?? []).map((option) => ({
        id: option.id,
        label: <Markdown className="text-base leading-relaxed">{option.text}</Markdown>,
      })),
    }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-line pb-8">
        <Link href="/learn/quizzes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Quizzes
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="eyebrow">
            Module {owner.module.position} · {owner.module.title}
          </p>
          {standing?.passed ? <Badge tone="accent">Passed</Badge> : null}
        </div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{quiz.title}</h1>
        {quiz.description ? <p className="mt-3 text-lg text-ink-soft">{quiz.description}</p> : null}
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="inline text-ink-faint">Pass mark </dt>
            <dd className="inline font-semibold">{quiz.pass_percent}%</dd>
          </div>
          <div>
            <dt className="inline text-ink-faint">Attempts </dt>
            <dd className="inline font-semibold">
              {history.length}
              {quiz.max_attempts === null ? " (unlimited)" : ` of ${quiz.max_attempts}`}
            </dd>
          </div>
          {standing ? (
            <div>
              <dt className="inline text-ink-faint">Best score </dt>
              <dd className="inline font-semibold">{Math.round(standing.bestPercent)}%</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {locked ? (
        <div className="card flex items-start gap-4 p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-faint">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">This quiz is locked</h2>
            <p className="mt-1 text-ink-soft">{owner.lockReason}.</p>
            {progress.nextStep ? (
              <ButtonLink href={progress.nextStep.href} className="mt-4">
                Continue with {progress.nextStep.title}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      ) : attemptsLeft === 0 ? (
        <EmptyState title="No attempts left">
          You have used all {quiz.max_attempts} attempts. Your best score is {Math.round(standing?.bestPercent ?? 0)}%.
        </EmptyState>
      ) : questions.length === 0 ? (
        <EmptyState title="This quiz has no questions yet">Check back once your instructor has finished setting it up.</EmptyState>
      ) : (
        <section aria-label={history.length > 0 ? "Retake the quiz" : "Take the quiz"}>
          {history.length > 0 ? (
            <p className="mb-4 text-ink-soft">
              {standing?.passed ? "You have already passed. A retake can only raise your best score." : "Try again when you are ready. Your best score counts."}
            </p>
          ) : null}
          {/* Keyed by attempt count so a finished attempt always starts a fresh runner. */}
          <QuizRunner key={history.length} quizId={quiz.id} questions={questions} />
        </section>
      )}

      <section aria-labelledby="history" className="space-y-4">
        <SectionHeading id="history" title="Attempt history" />
        {history.length === 0 ? (
          <p className="text-ink-soft">You have not attempted this quiz yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-ink-faint">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Attempt</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3 font-semibold tabular-nums">{attempt.attempt_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {formatDateTime(attempt.submitted_at, viewer.profile.timezone)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatScore(Number(attempt.score))}/{formatScore(Number(attempt.max_score))} ({Math.round(Number(attempt.percent))}%)
                    </td>
                    <td className="px-4 py-3">
                      {attempt.passed ? <Badge tone="accent">Passed</Badge> : <Badge tone="danger">Not passed</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/learn/quizzes/${quiz.slug}/attempts/${attempt.id}`} className="font-semibold text-accent underline-offset-4 hover:underline">
                        Review<span className="sr-only"> attempt {attempt.attempt_number}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

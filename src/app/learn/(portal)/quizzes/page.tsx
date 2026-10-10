import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  const viewer = await requireViewer();
  const { progress, quizzes, record, attempts } = await requireCourseState();
  const rows = progress.moduleProgress.flatMap((item) =>
    quizzes.filter((q) => q.module_id === item.module.id).map((quiz) => ({ quiz, item })),
  );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Quizzes"
        title="Check your understanding"
        description={
          progress.quizzes.attempted > 0
            ? `You have passed ${progress.quizzes.passed} of ${progress.quizzes.total} quizzes, with an average best score of ${progress.quizzes.averageBestPercent}%.`
            : "Each module ends with a short quiz. You can retake a quiz, and your best score counts."
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="No quizzes yet">Quizzes appear here when your instructor publishes them.</EmptyState>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {rows.map(({ quiz, item }) => {
            const standing = record.quizStandings.get(quiz.id);
            const last = attempts.find((a) => a.quiz_id === quiz.id);
            const locked = item.state === "locked";
            return (
              <li key={quiz.id} className="card flex flex-col p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow">{item.module.label}</p>
                  {locked ? (
                    <Badge>
                      <Lock className="size-3" aria-hidden="true" />
                      Locked
                    </Badge>
                  ) : standing?.passed ? (
                    <Badge tone="accent">Passed</Badge>
                  ) : standing ? (
                    <Badge tone="warn">Not yet passed</Badge>
                  ) : (
                    <Badge>Not attempted</Badge>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-semibold">
                  {locked ? (
                    quiz.title
                  ) : (
                    <Link href={`/learn/quizzes/${quiz.slug}`} className="hover:text-accent">
                      {quiz.title}
                    </Link>
                  )}
                </h2>
                <p className="mt-1.5 flex-1 text-ink-soft">{quiz.description}</p>
                <div className="mt-5 border-t border-line pt-4 text-sm">
                  {locked ? (
                    <p className="text-ink-faint">{item.lockReason}.</p>
                  ) : standing ? (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold tabular-nums">Best score {Math.round(standing.bestPercent)}%</span>
                        <span className="text-ink-faint">
                          {standing.attempts} {standing.attempts === 1 ? "attempt" : "attempts"}
                          {last ? ` · last on ${formatDate(last.submitted_at, viewer.profile.timezone)}` : ""}
                        </span>
                      </div>
                      <ProgressBar value={standing.bestPercent} label={`Best score for ${quiz.title}`} className="mt-2" />
                      <p className="mt-2 text-ink-faint">Pass mark {quiz.pass_percent}%</p>
                    </>
                  ) : (
                    <p className="text-ink-faint">Pass mark {quiz.pass_percent}% · unlimited retakes unless stated</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

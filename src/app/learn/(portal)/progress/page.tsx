import type { Metadata } from "next";
import Link from "next/link";

import { ModuleStateBadge, ProjectStatusBadge } from "@/components/status";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { pathSummary } from "@/lib/domain/path";

export const metadata: Metadata = { title: "Progress" };

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card p-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 font-serif text-3xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-1 text-sm text-ink-soft">{detail}</dd>
    </div>
  );
}

export default async function ProgressPage() {
  const { course, progress, record, quizzes, projects, problems, practice, path } = await requireCourseState();
  const practiceSubmitted = problems.filter((problem) => {
    const status = practice.get(problem.id)?.status;
    return status === "submitted" || status === "verified";
  }).length;
  const practiceDrafts = problems.filter((problem) => practice.get(problem.id)?.status === "draft").length;
  const remaining = progress.totalItems - progress.doneItems;

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Progress" title="Your progress" description={course.title} />

      <section aria-label="Overall completion" className="card grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="mx-auto">
          <ProgressRing value={progress.percent} label="Overall course completion" size={168} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">
            {progress.doneItems} of {progress.totalItems} required items done
          </h2>
          <p className="mt-2 text-ink-soft">
            {remaining === 0
              ? "You have completed every lesson, quiz and project in the course."
              : `${remaining} to go. Lessons, quizzes and projects each count once, with equal weight.`}
          </p>
          <details className="mt-4 rounded-lg border border-line bg-paper">
            <summary className="px-4 py-3 text-sm font-semibold">How completion is calculated</summary>
            <div className="space-y-2 border-t border-line px-4 py-4 text-[0.95rem] text-ink-soft">
              <p>
                Completion = required items done ÷ all required items, rounded down to a whole percent. It only
                reaches 100% when everything is done.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>A lesson counts when you mark it complete.</li>
                <li>A quiz counts when your best attempt reaches its pass mark.</li>
                <li>A project counts when it is submitted or reviewed. A saved draft does not count.</li>
              </ul>
              <p>
                Practice problems are not part of this percentage: they are saved for your own review and are not graded
                automatically. Only published modules are counted ({pathSummary(path)}).
              </p>
            </div>
          </details>
        </div>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lessons completed" value={`${progress.lessons.done}/${progress.lessons.total}`} detail="Marked complete by you" />
        <Stat label="Modules completed" value={`${progress.modules.done}/${progress.modules.total}`} detail="Every item in the module done" />
        <Stat
          label="Quizzes"
          value={`${progress.quizzes.passed}/${progress.quizzes.total}`}
          detail={
            progress.quizzes.attempted > 0
              ? `Passed. ${progress.quizzes.attempted} attempted, average best score ${progress.quizzes.averageBestPercent}%`
              : "Passed. None attempted yet"
          }
        />
        <Stat label="Projects submitted" value={`${progress.projects.submitted}/${progress.projects.total}`} detail="Submitted or reviewed" />
        <Stat
          label="Practice problems"
          value={`${practiceSubmitted}/${problems.length}`}
          detail={`Submitted for self-review, not graded. ${practiceDrafts} in draft. Not counted in completion`}
        />
      </dl>

      <section aria-labelledby="by-module" className="space-y-4">
        <SectionHeading id="by-module" title="By module" />
        <ol className="space-y-4">
          {progress.moduleProgress.map((item) => {
            const { module: mod } = item;
            return (
              <li key={mod.id} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">{mod.label}</p>
                    <h3 className="mt-1 text-xl font-semibold">
                      {item.state === "locked" ? (
                        mod.title
                      ) : (
                        <Link href={`/learn/modules/${mod.slug}`} className="hover:text-accent">
                          {mod.title}
                        </Link>
                      )}
                    </h3>
                  </div>
                  <ModuleStateBadge state={item.state} />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={item.percent} label={`${mod.label} completion`} />
                  <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums">{item.percent}%</span>
                </div>
                <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-ink-faint">Lessons</dt>
                    <dd className="font-semibold tabular-nums">
                      {item.lessonsDone} of {mod.lessons.length} completed
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Quiz</dt>
                    <dd className="font-semibold">
                      {mod.quizzes.length === 0
                        ? "None"
                        : mod.quizzes
                            .map((quiz) => {
                              const standing = record.quizStandings.get(quiz.id);
                              return standing
                                ? `${Math.round(standing.bestPercent)}% (${standing.passed ? "passed" : "not yet passed"})`
                                : "Not attempted";
                            })
                            .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Project</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {mod.projects.length === 0
                        ? "None"
                        : mod.projects.map((project) => (
                            <ProjectStatusBadge key={project.id} status={record.projectStatuses.get(project.id) ?? "not_started"} />
                          ))}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-sm text-ink-faint">
        {quizzes.length} quizzes, {projects.length} projects and {problems.length} practice problems are published in this course at the
        moment.
      </p>
    </div>
  );
}

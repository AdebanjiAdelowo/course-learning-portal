import type { Metadata } from "next";
import Link from "next/link";

import { ModuleOutline } from "@/components/module-outline";
import { ModuleStateBadge } from "@/components/status";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { formatDate, formatDuration } from "@/lib/format";
import { requireViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage() {
  const viewer = await requireViewer();
  const { course, progress, record } = await requireCourseState();
  const currentHref = progress.nextStep?.href ?? null;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Curriculum"
        title={course.title}
        description={`${progress.modules.total} modules · ${progress.lessons.total} lessons · ${progress.quizzes.total} quizzes · ${progress.projects.total} projects`}
      />

      {progress.moduleProgress.length === 0 ? (
        <EmptyState title="The curriculum is being prepared">
          Modules will appear here as soon as your instructor publishes them.
        </EmptyState>
      ) : (
        <ol className="space-y-6">
          {progress.moduleProgress.map((item) => {
            const { module: mod } = item;
            const headingId = `module-${mod.slug}`;
            return (
              <li key={mod.id}>
                <section aria-labelledby={headingId} className="card overflow-hidden">
                  <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="eyebrow">Module {mod.position}</p>
                        <ModuleStateBadge state={item.state} />
                      </div>
                      <h2 id={headingId} className="mt-3 text-2xl font-semibold">
                        {item.state === "locked" ? (
                          mod.title
                        ) : (
                          <Link href={`/learn/modules/${mod.slug}`} className="hover:text-accent">
                            {mod.title}
                          </Link>
                        )}
                      </h2>
                      <p className="mt-2 text-ink-soft">{mod.description}</p>
                      <p className="mt-4 text-sm text-ink-faint">
                        {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"} ·{" "}
                        {formatDuration(item.durationMinutes)} of reading
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <ProgressBar value={item.percent} label={`Module ${mod.position} completion`} />
                        <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums">{item.percent}%</span>
                      </div>
                      {item.lockReason ? (
                        <p className="mt-4 rounded-lg bg-sunken px-3.5 py-2.5 text-sm text-ink-soft">
                          {mod.availableFrom && new Date(mod.availableFrom) > new Date()
                            ? `Opens on ${formatDate(mod.availableFrom, viewer.profile.timezone)}.`
                            : `${item.lockReason}.`}
                        </p>
                      ) : null}
                    </div>
                    <div className="lg:border-l lg:border-line lg:pl-8">
                      <ModuleOutline progress={item} record={record} currentHref={currentHref} />
                    </div>
                  </div>
                </section>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

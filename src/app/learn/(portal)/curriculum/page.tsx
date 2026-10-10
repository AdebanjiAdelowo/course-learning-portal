import type { Metadata } from "next";
import Link from "next/link";

import { PhaseSection, PlannedModule } from "@/components/learning-path";
import { ModuleOutline } from "@/components/module-outline";
import { ModuleStateBadge } from "@/components/status";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { pathSummary } from "@/lib/domain/path";
import type { ModuleProgress, StudentRecord } from "@/lib/domain/progress";
import { formatDate, formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Curriculum" };

function AvailableModule({
  item,
  record,
  currentHref,
  problemCount,
  timezone,
}: {
  item: ModuleProgress;
  record: StudentRecord;
  currentHref: string | null;
  problemCount: number;
  timezone: string;
}) {
  const { module: mod } = item;
  const headingId = `module-${mod.slug}`;
  return (
    <section aria-labelledby={headingId} className="card overflow-hidden">
      <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Module {mod.position}</p>
            <ModuleStateBadge state={item.state} />
          </div>
          <h3 id={headingId} className="mt-3 text-2xl font-semibold">
            {item.state === "locked" ? (
              mod.title
            ) : (
              <Link href={`/learn/modules/${mod.slug}`} className="hover:text-accent">
                {mod.title}
              </Link>
            )}
          </h3>
          <p className="mt-2 text-ink-soft">{mod.description}</p>
          <p className="mt-4 text-sm text-ink-faint">
            {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"} · {formatDuration(item.durationMinutes)} of reading
            {problemCount > 0 ? ` · ${problemCount} practice ${problemCount === 1 ? "problem" : "problems"}` : ""}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar value={item.percent} label={`Module ${mod.position} completion`} />
            <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums">{item.percent}%</span>
          </div>
          {item.lockReason ? (
            <p className="mt-4 rounded-lg bg-sunken px-3.5 py-2.5 text-sm text-ink-soft">
              {mod.availableFrom && new Date(mod.availableFrom) > new Date()
                ? `Opens on ${formatDate(mod.availableFrom, timezone)}.`
                : `${item.lockReason}.`}
            </p>
          ) : null}
        </div>
        <div className="lg:border-l lg:border-line lg:pl-8">
          <ModuleOutline progress={item} record={record} currentHref={currentHref} />
        </div>
      </div>
    </section>
  );
}

export default async function CurriculumPage() {
  const viewer = await requireViewer();
  const { course, progress, record, path, problems } = await requireCourseState();
  const currentHref = progress.nextStep?.href ?? null;
  const bySlug = new Map(progress.moduleProgress.map((item) => [item.module.slug, item]));
  const currentSlug = progress.currentModule?.module.slug ?? null;

  // Open the phase the student is working in; failing that, the first one with anything to open.
  const openPhase =
    path.phases.find((phase) => phase.modules.some((mod) => mod.slug === currentSlug)) ??
    path.phases.find((phase) => phase.available > 0) ??
    path.phases[0];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Curriculum"
        title={course.title}
        description={
          <>
            {path.phases.filter((phase) => phase.number > 0).length} phases · {pathSummary(path)}
            <span className="mt-1 block text-base text-ink-faint">
              Available now: {progress.lessons.total} lessons · {progress.quizzes.total} quizzes · {progress.projects.total} projects ·{" "}
              {problems.length} practice problems
            </span>
          </>
        }
      />

      {path.total === 0 ? (
        <EmptyState title="The curriculum is being prepared">
          Modules will appear here as soon as your instructor publishes them.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <p className="text-ink-soft">
            The path below is the whole course. Modules marked <strong className="font-semibold text-ink">Planned</strong> are not
            written yet: you can see what they will cover, and they open as they are published.
          </p>
          {path.phases.map((phase) => (
            <PhaseSection key={phase.id ?? "other"} phase={phase} defaultOpen={phase === openPhase}>
              <ol className="space-y-4">
                {phase.modules.map((mod) => {
                  const item = mod.isPublished ? bySlug.get(mod.slug) : undefined;
                  return (
                    <li key={mod.slug}>
                      {item ? (
                        <AvailableModule
                          item={item}
                          record={record}
                          currentHref={currentHref}
                          problemCount={problems.filter((problem) => problem.module_id === item.module.id).length}
                          timezone={viewer.profile.timezone}
                        />
                      ) : (
                        <PlannedModule module={mod} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </PhaseSection>
          ))}
        </div>
      )}
    </div>
  );
}

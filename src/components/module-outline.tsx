import { Check, ClipboardCheck, FlaskConical, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { isProjectDone, type ModuleProgress, type StudentRecord } from "@/lib/domain/progress";
import { formatDuration } from "@/lib/format";

type RowState = "done" | "current" | "todo" | "locked";

function Marker({ state, children }: { state: RowState; children?: ReactNode }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold";
  if (state === "done") {
    return (
      <span className={cn(base, "border-accent bg-accent text-on-accent")}>
        <Check className="size-4" aria-hidden="true" />
      </span>
    );
  }
  if (state === "locked") {
    return (
      <span className={cn(base, "border-line bg-sunken text-ink-faint")}>
        <Lock className="size-3.5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        state === "current" ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong text-ink-faint",
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

const stateText: Record<RowState, string> = {
  done: "Completed",
  current: "Up next",
  todo: "Not started",
  locked: "Locked",
};

function Row({
  href,
  state,
  marker,
  title,
  meta,
  compact,
  active,
}: {
  href: string;
  state: RowState;
  marker: ReactNode;
  title: string;
  meta: string;
  compact: boolean;
  active: boolean;
}) {
  const content = (
    <>
      <Marker state={state}>{marker}</Marker>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", compact ? "text-sm" : "text-base", state === "current" || active ? "font-semibold text-ink" : "text-ink-soft")}>
          {title}
        </span>
        {compact ? null : <span className="block text-sm text-ink-faint">{meta}</span>}
      </span>
      <span className="sr-only">{stateText[state]}</span>
      {!compact && state === "current" ? (
        <span className="eyebrow shrink-0 text-accent" aria-hidden="true">
          Up next
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "flex items-center gap-3 rounded-lg",
    compact ? "px-2 py-1.5" : "px-3 py-2.5",
    active && "bg-accent-soft",
  );

  if (state === "locked") {
    return <div className={cn(className, "opacity-70")}>{content}</div>;
  }
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(className, "transition-colors hover:bg-sunken")}>
      {content}
    </Link>
  );
}

/**
 * The ordered contents of one module: lessons, then its quiz and project. Used on the
 * curriculum page (roomy) and in the lesson sidebar (compact).
 */
export function ModuleOutline({
  progress,
  record,
  currentHref,
  activeLessonId,
  compact = false,
}: {
  progress: ModuleProgress;
  record: StudentRecord;
  /** href of the course-wide "next step", highlighted as "Up next". */
  currentHref: string | null;
  activeLessonId?: string;
  compact?: boolean;
}) {
  const { module: mod, state } = progress;
  const locked = state === "locked";

  return (
    <ol className={compact ? "space-y-0.5" : "space-y-1"}>
      {mod.lessons.map((lesson, index) => {
        const href = `/learn/lessons/${lesson.slug}`;
        const done = record.completedLessonIds.has(lesson.id);
        return (
          <li key={lesson.id}>
            <Row
              href={href}
              state={locked ? "locked" : done ? "done" : href === currentHref ? "current" : "todo"}
              marker={index + 1}
              title={lesson.title}
              meta={`Lesson · ${formatDuration(lesson.durationMinutes)}`}
              compact={compact}
              active={lesson.id === activeLessonId}
            />
          </li>
        );
      })}
      {mod.quizzes.map((quiz) => {
        const href = `/learn/quizzes/${quiz.slug}`;
        const standing = record.quizStandings.get(quiz.id);
        return (
          <li key={quiz.id}>
            <Row
              href={href}
              state={locked ? "locked" : standing?.passed ? "done" : href === currentHref ? "current" : "todo"}
              marker={<ClipboardCheck className="size-3.5" />}
              title={quiz.title}
              meta={
                standing
                  ? `Quiz · best score ${Math.round(standing.bestPercent)}% (pass mark ${quiz.passPercent}%)`
                  : `Quiz · pass mark ${quiz.passPercent}%`
              }
              compact={compact}
              active={false}
            />
          </li>
        );
      })}
      {mod.projects.map((project) => {
        const href = `/learn/projects/${project.slug}`;
        const status = record.projectStatuses.get(project.id);
        return (
          <li key={project.id}>
            <Row
              href={href}
              state={locked ? "locked" : isProjectDone(status) ? "done" : href === currentHref ? "current" : "todo"}
              marker={<FlaskConical className="size-3.5" />}
              title={project.title}
              meta={`Project · ${status === "reviewed" ? "reviewed" : status === "submitted" ? "submitted" : status === "in_progress" ? "draft saved" : "not started"}`}
              compact={compact}
              active={false}
            />
          </li>
        );
      })}
    </ol>
  );
}

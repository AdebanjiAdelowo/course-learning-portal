import { ArrowRight, CalendarClock, Check, ClipboardCheck, Code2, FlaskConical, Megaphone, MessageSquareText, PartyPopper, Pin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Markdown } from "@/components/markdown";
import { DifficultyBadge, PracticeStatusBadge } from "@/components/practice-status";
import { DueBadge, ProjectStatusBadge, SessionStatusBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { pathSummary } from "@/lib/domain/path";
import { difficultyOrder } from "@/lib/domain/practice";
import { isProjectDone } from "@/lib/domain/progress";
import { nearestSession, sessionStatus } from "@/lib/domain/sessions";
import { dueState, formatDate, formatDuration, formatLongDate, formatScore, formatTime, relativeDays, zoneLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

function Panel({
  title,
  icon,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = `panel-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`card flex flex-col p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="flex items-center gap-2.5 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">
          <span className="text-accent">{icon}</span>
          {title}
        </h2>
        {href && linkLabel ? (
          <Link href={href} className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-ink-soft">{children}</p>;
}

const stepLabel = { lesson: "Next lesson", quiz: "Next quiz", project: "Next project" } as const;
const stepAction = { lesson: "Continue learning", quiz: "Take the quiz", project: "Open the project" } as const;

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const state = await requireCourseState();
  const { course, progress, record, projects, quizzes, lessons, completedAt, problems, practice, path } = state;
  const zone = viewer.profile.timezone;
  const now = new Date();

  const supabase = await createClient();
  const [sessions, announcements, feedback] = await Promise.all([
    supabase
      .from("live_sessions")
      .select("id, title, starts_at, ends_at, timezone, instructor_name, meeting_url")
      .eq("course_id", course.id)
      .gte("ends_at", now.toISOString())
      .order("starts_at")
      .limit(5),
    supabase
      .from("announcements")
      .select("id, title, body_md, pinned, published_at")
      .eq("course_id", course.id)
      .lte("published_at", now.toISOString())
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("feedback")
      .select("id, title, kind, score, max_score, read_at, created_at")
      .eq("student_id", viewer.id)
      .eq("course_id", course.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);
  if (sessions.error) throw new Error(`Could not load live sessions: ${sessions.error.message}`);
  if (announcements.error) throw new Error(`Could not load announcements: ${announcements.error.message}`);
  if (feedback.error) throw new Error(`Could not load feedback: ${feedback.error.message}`);

  const session = nearestSession(sessions.data, now);
  const { nextStep, currentModule } = progress;
  const firstName = viewer.profile.full_name.split(/\s+/)[0];

  // Projects still to hand in, from unlocked modules, most urgent first.
  const unlockedModuleIds = new Set(
    progress.moduleProgress.filter((m) => m.state !== "locked").map((m) => m.module.id),
  );
  const openProjects = projects
    .filter((p) => unlockedModuleIds.has(p.module_id) && !isProjectDone(record.projectStatuses.get(p.id)))
    .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))
    .slice(0, 3);

  // Practice to suggest: drafts first (work in hand), then untouched problems, easiest first.
  const openProblems = problems
    .filter((p) => unlockedModuleIds.has(p.module_id))
    .map((problem) => ({ problem, status: practice.get(problem.id)?.status ?? ("not_attempted" as const) }));
  const practiceDone = openProblems.filter((row) => row.status === "submitted" || row.status === "verified").length;
  const suggestedProblems = openProblems
    .filter((row) => row.status === "draft" || row.status === "not_attempted")
    .sort(
      (a, b) =>
        Number(b.status === "draft") - Number(a.status === "draft") ||
        difficultyOrder[a.problem.difficulty] - difficultyOrder[b.problem.difficulty],
    )
    .slice(0, 3);
  const currentPhase = progress.currentModule
    ? path.phases.find((phase) => phase.modules.some((mod) => mod.slug === progress.currentModule!.module.slug))
    : undefined;

  const recentLessons = lessons
    .flatMap((lesson) => {
      const at = completedAt.get(lesson.id);
      return at ? [{ lesson, at }] : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);

  const attemptedQuizzes = quizzes.flatMap((quiz) => {
    const standing = record.quizStandings.get(quiz.id);
    return standing ? [{ quiz, standing }] : [];
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{formatLongDate(now.toISOString(), zone)}</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Welcome back, {firstName}</h1>
        <p className="mt-2 text-lg text-ink-soft">
          {nextStep ? "Here is what to work on next." : "You have finished everything that is currently open."}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* The answer to "what should I work on next?" */}
        <section aria-labelledby="next-up" className="card relative overflow-hidden p-6 sm:p-8 lg:col-span-2">
          <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
          {nextStep ? (
            <>
              <p className="eyebrow text-accent">
                {stepLabel[nextStep.kind]} · Module {nextStep.modulePosition}
              </p>
              <h2 id="next-up" className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
                {nextStep.title}
              </h2>
              <p className="mt-2 text-ink-soft">
                {nextStep.moduleTitle}
                {nextStep.durationMinutes ? ` · ${formatDuration(nextStep.durationMinutes)}` : ""}
              </p>
              <div className="mt-6">
                <ButtonLink href={nextStep.href} size="lg">
                  {stepAction[nextStep.kind]}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </ButtonLink>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow text-accent">All caught up</p>
              <h2 id="next-up" className="mt-3 flex items-center gap-3 text-2xl font-semibold sm:text-3xl">
                <PartyPopper className="size-7 text-clay" aria-hidden="true" />
                {progress.percent === 100 ? "You have completed the course" : "Nothing is waiting for you"}
              </h2>
              <p className="mt-2 text-ink-soft">
                {progress.percent === 100
                  ? "Every lesson, quiz and project is done. Your work stays available for review."
                  : "The next module opens soon. In the meantime you can revisit earlier lessons."}
              </p>
              <div className="mt-6">
                <ButtonLink href="/learn/curriculum" variant="secondary" size="lg">
                  Review the curriculum
                </ButtonLink>
              </div>
            </>
          )}

          {currentModule ? (
            <div className="mt-8 border-t border-line pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">
                  <span className="text-ink-faint">
                    {currentPhase && currentPhase.number > 0 ? `Phase ${currentPhase.number}: ${currentPhase.title} · ` : ""}Current module ·{" "}
                  </span>
                  <Link href={`/learn/modules/${currentModule.module.slug}`} className="font-semibold hover:text-accent">
                    {currentModule.module.position}. {currentModule.module.title}
                  </Link>
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {currentModule.doneItems} of {currentModule.totalItems} done
                </p>
              </div>
              <ProgressBar value={currentModule.percent} label="Current module completion" className="mt-2.5" />
            </div>
          ) : null}
        </section>

        <section aria-labelledby="overall" className="card flex flex-col items-center p-6 text-center">
          <h2 id="overall" className="font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">
            Course progress
          </h2>
          <div className="mt-5">
            <ProgressRing value={progress.percent} label="Overall course completion" />
          </div>
          <ProgressBar value={progress.percent} label="Overall course completion (bar)" className="mt-5" />
          <dl className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
            {[
              ["Lessons", `${progress.lessons.done}/${progress.lessons.total}`],
              ["Quizzes", `${progress.quizzes.passed}/${progress.quizzes.total}`],
              ["Projects", `${progress.projects.submitted}/${progress.projects.total}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="font-serif text-xl font-semibold tabular-nums">{value}</dd>
                <dt className="text-xs text-ink-faint">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-ink-faint">
            Of the modules published so far. {pathSummary(path)}.
          </p>
          <Link href="/learn/progress" className="mt-3 text-sm font-semibold text-accent underline-offset-4 hover:underline">
            See full progress
          </Link>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Upcoming live session" icon={<CalendarClock className="size-4.5" aria-hidden="true" />} href="/learn/sessions" linkLabel="All sessions">
          {session ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SessionStatusBadge status={sessionStatus(session.starts_at, session.ends_at, now)} />
                <span className="text-sm text-ink-faint">{relativeDays(session.starts_at, now)}</span>
              </div>
              <p className="mt-3 font-serif text-xl font-semibold">{session.title}</p>
              <p className="mt-1 text-ink-soft">
                {formatLongDate(session.starts_at, zone)}, {formatTime(session.starts_at, zone)} to{" "}
                {formatTime(session.ends_at, zone)}
              </p>
              <p className="text-sm text-ink-faint">
                {zoneLabel(session.starts_at, zone)} · with {session.instructor_name}
              </p>
              {session.meeting_url ? (
                <a
                  href={session.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Open meeting link
                  <ArrowRight className="size-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          ) : (
            <Quiet>No sessions are scheduled at the moment. Recordings of past sessions are under Live sessions.</Quiet>
          )}
        </Panel>

        <Panel title="Projects due" icon={<FlaskConical className="size-4.5" aria-hidden="true" />} href="/learn/projects" linkLabel="All projects">
          {openProjects.length > 0 ? (
            <ul className="-my-3 divide-y divide-line">
              {openProjects.map((project) => (
                <li key={project.id} className="py-3">
                  <Link href={`/learn/projects/${project.slug}`} className="font-semibold hover:text-accent">
                    {project.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <ProjectStatusBadge status={record.projectStatuses.get(project.id) ?? "not_started"} />
                    {project.due_at ? (
                      <>
                        <DueBadge state={dueState(project.due_at, now)} text={relativeDays(project.due_at, now)} />
                        <span className="text-sm text-ink-faint">{formatDate(project.due_at, zone)}</span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>No open projects. Everything available to you has been handed in.</Quiet>
          )}
        </Panel>

        <Panel title="Coding practice" icon={<Code2 className="size-4.5" aria-hidden="true" />} href="/learn/practice" linkLabel="All practice">
          {openProblems.length === 0 ? (
            <Quiet>Practice problems will appear here as modules are published.</Quiet>
          ) : (
            <>
              <p className="text-ink-soft">
                <span className="font-serif text-2xl font-semibold text-ink tabular-nums">{practiceDone}</span> of {openProblems.length}{" "}
                problems submitted for self-review.
              </p>
              {suggestedProblems.length > 0 ? (
                <ul className="mt-3 divide-y divide-line">
                  {suggestedProblems.map(({ problem, status }) => (
                    <li key={problem.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2.5">
                      <Link href={`/learn/practice/${problem.slug}`} className="font-semibold hover:text-accent">
                        {problem.title}
                      </Link>
                      <span className="flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={problem.difficulty} />
                        {status === "draft" ? <PracticeStatusBadge status={status} /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">You have submitted an attempt for every open problem.</p>
              )}
            </>
          )}
        </Panel>

        <Panel title="Recent feedback" icon={<MessageSquareText className="size-4.5" aria-hidden="true" />} href="/learn/feedback" linkLabel="All feedback">
          {feedback.data.length > 0 ? (
            <ul className="-my-3 divide-y divide-line">
              {feedback.data.map((item) => (
                <li key={item.id} className="py-3">
                  <Link href={`/learn/feedback#feedback-${item.id}`} className="group flex items-start gap-3">
                    <span
                      className={`mt-2 size-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-clay"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block group-hover:text-accent ${item.read_at ? "font-medium" : "font-bold"}`}>
                        {item.title}
                      </span>
                      <span className="block text-sm text-ink-faint">
                        {formatDate(item.created_at, zone)}
                        {item.score !== null && item.max_score !== null
                          ? ` · ${formatScore(Number(item.score))}/${formatScore(Number(item.max_score))}`
                          : ""}
                      </span>
                    </span>
                    {item.read_at ? null : <Badge tone="clay">New</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>Feedback from your instructor will appear here once your first project is reviewed.</Quiet>
          )}
        </Panel>

        <Panel title="Quiz performance" icon={<ClipboardCheck className="size-4.5" aria-hidden="true" />} href="/learn/quizzes" linkLabel="All quizzes">
          {attemptedQuizzes.length > 0 ? (
            <div>
              <p className="text-ink-soft">
                Average best score{" "}
                <span className="font-serif text-2xl font-semibold text-ink tabular-nums">
                  {progress.quizzes.averageBestPercent}%
                </span>{" "}
                across {attemptedQuizzes.length} of {progress.quizzes.total} quizzes.
              </p>
              <ul className="mt-4 space-y-3">
                {attemptedQuizzes.map(({ quiz, standing }) => (
                  <li key={quiz.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/learn/quizzes/${quiz.slug}`} className="truncate font-semibold hover:text-accent">
                        {quiz.title}
                      </Link>
                      <span className="shrink-0 tabular-nums">
                        {Math.round(standing.bestPercent)}%{" "}
                        <span className={standing.passed ? "text-accent" : "text-danger"}>
                          {standing.passed ? "passed" : "not yet passed"}
                        </span>
                      </span>
                    </div>
                    <ProgressBar value={standing.bestPercent} label={`Best score for ${quiz.title}`} className="mt-1.5" />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Quiet>You have not taken a quiz yet. Each module ends with one.</Quiet>
          )}
        </Panel>

        <Panel title="Announcements" icon={<Megaphone className="size-4.5" aria-hidden="true" />}>
          {announcements.data.length > 0 ? (
            <ul className="-my-4 divide-y divide-line">
              {announcements.data.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="flex items-center gap-2 font-semibold">
                    {item.pinned ? <Pin className="size-4 shrink-0 text-clay" aria-label="Pinned" /> : null}
                    {item.title}
                  </p>
                  <p className="text-sm text-ink-faint">{formatDate(item.published_at, zone)}</p>
                  <Markdown className="mt-2 text-[0.97rem] leading-relaxed text-ink-soft">{item.body_md}</Markdown>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>No announcements yet.</Quiet>
          )}
        </Panel>

        <Panel title="Completed lessons" icon={<Check className="size-4.5" aria-hidden="true" />} href="/learn/curriculum" linkLabel="Curriculum">
          {recentLessons.length > 0 ? (
            <>
              <p className="text-ink-soft">
                <span className="font-serif text-2xl font-semibold text-ink tabular-nums">{progress.lessons.done}</span> of{" "}
                {progress.lessons.total} lessons completed. Most recent:
              </p>
              <ul className="mt-3 space-y-2.5">
                {recentLessons.map(({ lesson, at }) => (
                  <li key={lesson.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/learn/lessons/${lesson.slug}`} className="truncate font-semibold hover:text-accent">
                      {lesson.title}
                    </Link>
                    <span className="shrink-0 text-ink-faint">{formatDate(at, zone)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Quiet>Lessons you finish will be listed here.</Quiet>
          )}
        </Panel>
      </div>
    </div>
  );
}

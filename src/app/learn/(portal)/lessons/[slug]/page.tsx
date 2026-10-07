import { ArrowLeft, ArrowRight, Check, Clock, Lock, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setLessonComplete } from "@/app/learn/actions/lessons";
import { LessonShell } from "@/components/lesson-shell";
import { Markdown } from "@/components/markdown";
import { ModuleOutline } from "@/components/module-outline";
import { ResourceList } from "@/components/resource-list";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/progress";
import { VideoEmbed } from "@/components/video-embed";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { lessonNeighbours } from "@/lib/domain/progress";
import { formatDate, formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lessons } = await requireCourseState();
  return { title: lessons.find((l) => l.slug === slug)?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const { course, progress, record, completedAt, lessons } = await requireCourseState();

  const meta = lessons.find((l) => l.slug === slug);
  const owner = meta && progress.moduleProgress.find((m) => m.module.id === meta.module_id);
  if (!meta || !owner) notFound();

  const sidebar = (
    <nav aria-label="Lessons in this course" className="space-y-6">
      <div>
        <p className="eyebrow">Your progress</p>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar value={progress.percent} label="Course completion" />
          <span className="shrink-0 text-sm font-semibold tabular-nums">{progress.percent}%</span>
        </div>
      </div>
      {progress.moduleProgress.map((item) => (
        <div key={item.module.id}>
          <p className="eyebrow">Module {item.module.position}</p>
          <p className="mb-2 mt-1 font-serif text-base font-semibold leading-snug">{item.module.title}</p>
          <ModuleOutline
            progress={item}
            record={record}
            currentHref={progress.nextStep?.href ?? null}
            activeLessonId={meta.id}
            compact
          />
        </div>
      ))}
    </nav>
  );

  if (owner.state === "locked") {
    return (
      <LessonShell sidebar={sidebar}>
        <div className="card mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sunken text-ink-faint">
            <Lock className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">{meta.title}</h1>
          <p className="mt-2 text-ink-soft">
            This lesson belongs to Module {owner.module.position}, which is still locked. {owner.lockReason}.
          </p>
          {progress.nextStep ? (
            <ButtonLink href={progress.nextStep.href} className="mt-6">
              Continue with {progress.nextStep.title}
            </ButtonLink>
          ) : null}
        </div>
      </LessonShell>
    );
  }

  const supabase = await createClient();
  const [{ data: lesson, error }, { data: resources }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, summary, objectives, body_md, video_url, duration_minutes")
      .eq("id", meta.id)
      .maybeSingle(),
    supabase.from("resources").select("id, title, description, kind, url").eq("lesson_id", meta.id).order("position"),
  ]);
  if (error) throw new Error(`Could not load this lesson: ${error.message}`);
  if (!lesson) notFound();

  const { previous, next } = lessonNeighbours(progress.moduleProgress, lesson.id);
  const doneAt = completedAt.get(lesson.id);
  const lessonNumber = owner.module.lessons.findIndex((l) => l.id === lesson.id) + 1;

  // After the last lesson of a module, point at whatever the module still asks for.
  const afterLessons =
    next === null || !owner.module.lessons.some((l) => l.id === next.id)
      ? (owner.module.quizzes.find((q) => !record.quizStandings.get(q.id)?.passed) ?? null)
      : null;

  return (
    <LessonShell sidebar={sidebar}>
      <article className="mx-auto max-w-[46rem]">
        <header>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href="/learn/curriculum" className="hover:text-accent">
                  {course.title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/learn/modules/${owner.module.slug}`} className="hover:text-accent">
                  Module {owner.module.position}: {owner.module.title}
                </Link>
              </li>
            </ol>
          </nav>
          <p className="eyebrow mt-6">
            Lesson {lessonNumber} of {owner.module.lessons.length}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-[2.6rem]">{lesson.title}</h1>
          {lesson.summary ? <p className="mt-4 text-xl leading-relaxed text-ink-soft">{lesson.summary}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {formatDuration(lesson.duration_minutes)}
            </span>
            {doneAt ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <Check className="size-4" aria-hidden="true" />
                Completed on {formatDate(doneAt, viewer.profile.timezone)}
              </span>
            ) : null}
          </div>
        </header>

        {lesson.objectives.length > 0 ? (
          <section aria-labelledby="objectives" className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="objectives" className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">
              <Target className="size-4 text-accent" aria-hidden="true" />
              After this lesson you will be able to
            </h2>
            <ul className="mt-3 space-y-2">
              {lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-3">
                  <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {lesson.video_url ? (
          <div className="mt-8">
            <VideoEmbed url={lesson.video_url} title={lesson.title} />
          </div>
        ) : null}

        <Markdown className="mt-10">{lesson.body_md}</Markdown>

        {resources && resources.length > 0 ? (
          <section aria-labelledby="lesson-resources" className="mt-12">
            <h2 id="lesson-resources" className="text-xl font-semibold">
              Resources for this lesson
            </h2>
            <div className="mt-4">
              <ResourceList resources={resources} />
            </div>
          </section>
        ) : null}

        <footer className="no-print mt-14 border-t border-line pt-8">
          <form action={setLessonComplete} className="flex flex-col items-center gap-3 text-center">
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="complete" value={doneAt ? "false" : "true"} />
            {doneAt ? (
              <>
                <p className="inline-flex items-center gap-2 text-lg font-semibold text-accent">
                  <Check className="size-5" aria-hidden="true" />
                  Lesson complete
                </p>
                <SubmitButton variant="ghost" size="sm" pendingLabel="Updating…">
                  Mark as not complete
                </SubmitButton>
              </>
            ) : (
              <>
                <SubmitButton size="lg" pendingLabel="Saving…">
                  <Check className="size-5" aria-hidden="true" />
                  Mark as complete
                </SubmitButton>
                <p className="text-sm text-ink-faint">Your progress is saved to your account.</p>
              </>
            )}
          </form>

          <nav aria-label="Lesson navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link href={`/learn/lessons/${previous.slug}`} className="card group p-4 transition-colors hover:border-line-strong">
                <span className="eyebrow flex items-center gap-1.5">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Previous lesson
                </span>
                <span className="mt-1 block font-semibold group-hover:text-accent">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {afterLessons ? (
              <Link href={`/learn/quizzes/${afterLessons.slug}`} className="card group p-4 text-right transition-colors hover:border-line-strong">
                <span className="eyebrow flex items-center justify-end gap-1.5">
                  Module quiz
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block font-semibold group-hover:text-accent">{afterLessons.title}</span>
              </Link>
            ) : next ? (
              <Link href={`/learn/lessons/${next.slug}`} className="card group p-4 text-right transition-colors hover:border-line-strong">
                <span className="eyebrow flex items-center justify-end gap-1.5">
                  Next lesson
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block font-semibold group-hover:text-accent">{next.title}</span>
              </Link>
            ) : (
              <Link href="/learn/curriculum" className="card group p-4 text-right transition-colors hover:border-line-strong">
                <span className="eyebrow flex items-center justify-end gap-1.5">
                  Back to
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block font-semibold group-hover:text-accent">Curriculum</span>
              </Link>
            )}
          </nav>
        </footer>
      </article>
    </LessonShell>
  );
}

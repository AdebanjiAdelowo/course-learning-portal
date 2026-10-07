import { ArrowLeft, CalendarDays, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { ResourceList } from "@/components/resource-list";
import { DueBadge, ProjectStatusBadge } from "@/components/status";
import { SubmissionForm } from "@/components/submission-form";
import { ButtonLink } from "@/components/ui/button";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { isProjectDone } from "@/lib/domain/progress";
import { dueState, formatDate, formatDateTime, formatScore, relativeDays, zoneLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

interface RubricRow {
  criterion: string;
  description: string;
  points: number;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { projects } = await requireCourseState();
  return { title: projects.find((p) => p.slug === slug)?.title ?? "Project" };
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const zone = viewer.profile.timezone;
  const { projects, progress } = await requireCourseState();

  const meta = projects.find((p) => p.slug === slug);
  const owner = meta && progress.moduleProgress.find((m) => m.module.id === meta.module_id);
  if (!meta || !owner) notFound();

  if (owner.state === "locked") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sunken text-ink-faint">
          <Lock className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">{meta.title}</h1>
        <p className="mt-2 text-ink-soft">This project belongs to a module that is still locked. {owner.lockReason}.</p>
        {progress.nextStep ? (
          <ButtonLink href={progress.nextStep.href} className="mt-6">
            Continue with {progress.nextStep.title}
          </ButtonLink>
        ) : null}
      </div>
    );
  }

  const supabase = await createClient();
  const [project, resources, submission] = await Promise.all([
    supabase.from("projects").select("*").eq("id", meta.id).maybeSingle(),
    supabase.from("resources").select("id, title, description, kind, url").eq("project_id", meta.id).order("position"),
    supabase.from("submissions").select("*").eq("project_id", meta.id).eq("user_id", viewer.id).maybeSingle(),
  ]);
  if (project.error) throw new Error(`Could not load this project: ${project.error.message}`);
  if (submission.error) throw new Error(`Could not load your submission: ${submission.error.message}`);
  if (!project.data) notFound();

  const data = project.data;
  const mine = submission.data;
  const status = mine?.status ?? "not_started";
  const rubric = (data.rubric as unknown as RubricRow[]) ?? [];
  const now = new Date();

  const { data: feedback } = mine
    ? await supabase
        .from("feedback")
        .select("id, title, body_md, score, max_score, created_at, author:profiles!feedback_author_id_fkey(full_name)")
        .eq("submission_id", mine.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-8">
        <Link href="/learn/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Projects
        </Link>
        <p className="eyebrow mt-5">
          Module {owner.module.position} · {owner.module.title}
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{data.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">{data.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ProjectStatusBadge status={status} />
          {data.due_at ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
              <CalendarDays className="size-4" aria-hidden="true" />
              Deadline {formatDateTime(data.due_at, zone)} ({zoneLabel(data.due_at, zone)})
            </span>
          ) : null}
          {data.due_at && !isProjectDone(status) ? (
            <DueBadge state={dueState(data.due_at, now)} text={relativeDays(data.due_at, now)} />
          ) : null}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="brief">
            <h2 id="brief" className="text-xl font-semibold">Brief</h2>
            <Markdown className="mt-4">{data.description_md}</Markdown>
          </section>

          {data.objectives.length > 0 ? (
            <section aria-labelledby="project-objectives">
              <h2 id="project-objectives" className="text-xl font-semibold">Objectives</h2>
              <div className="mt-4"><Checklist items={data.objectives} /></div>
            </section>
          ) : null}

          {data.requirements.length > 0 ? (
            <section aria-labelledby="requirements">
              <h2 id="requirements" className="text-xl font-semibold">Requirements</h2>
              <div className="mt-4"><Checklist items={data.requirements} /></div>
            </section>
          ) : null}

          {rubric.length > 0 ? (
            <section aria-labelledby="rubric">
              <h2 id="rubric" className="text-xl font-semibold">Grading rubric</h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full text-left text-[0.95rem]">
                  <thead className="border-b border-line text-sm text-ink-faint">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Criterion</th>
                      <th scope="col" className="px-4 py-3 font-semibold">What we look for</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rubric.map((row) => (
                      <tr key={row.criterion}>
                        <th scope="row" className="px-4 py-3 align-top font-semibold">{row.criterion}</th>
                        <td className="px-4 py-3 align-top text-ink-soft">{row.description}</td>
                        <td className="px-4 py-3 text-right align-top tabular-nums">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-line-strong">
                    <tr>
                      <th scope="row" colSpan={2} className="px-4 py-3 font-semibold">Total</th>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{data.max_points}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <div className="min-w-0 space-y-8">
          {feedback && feedback.length > 0 ? (
            <section aria-labelledby="project-feedback" className="card border-clay/40 p-6">
              <h2 id="project-feedback" className="text-xl font-semibold">Instructor feedback</h2>
              <ul className="mt-4 space-y-6">
                {feedback.map((item) => (
                  <li key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{item.title}</p>
                      {item.score !== null && item.max_score !== null ? (
                        <p className="font-serif text-xl font-semibold tabular-nums">
                          {formatScore(Number(item.score))}
                          <span className="text-base text-ink-faint">/{formatScore(Number(item.max_score))}</span>
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm text-ink-faint">
                      {item.author?.full_name ?? "Instructor"} · {formatDate(item.created_at, zone)}
                    </p>
                    <Markdown className="mt-3 text-[0.97rem] leading-relaxed">{item.body_md}</Markdown>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="submission" className="card p-6">
            <h2 id="submission" className="text-xl font-semibold">Your submission</h2>
            {mine?.submitted_at ? (
              <p className="mt-1 text-sm text-ink-faint">Submitted on {formatDateTime(mine.submitted_at, zone)}</p>
            ) : null}
            {data.submission_instructions_md ? (
              <Markdown className="mt-4 text-[0.97rem] leading-relaxed text-ink-soft">{data.submission_instructions_md}</Markdown>
            ) : null}
            <div className="mt-6 border-t border-line pt-6">
              {status === "reviewed" && mine ? (
                <dl className="space-y-3 text-[0.97rem]">
                  <div>
                    <dt className="text-sm text-ink-faint">Submitted work</dt>
                    <dd>
                      {mine.work_url ? (
                        <a href={mine.work_url} target="_blank" rel="noopener noreferrer" className="font-semibold break-all text-accent underline underline-offset-4">
                          {mine.work_url}
                        </a>
                      ) : (
                        "No link"
                      )}
                    </dd>
                  </div>
                  {mine.notes ? (
                    <div>
                      <dt className="text-sm text-ink-faint">Your notes</dt>
                      <dd className="whitespace-pre-wrap">{mine.notes}</dd>
                    </div>
                  ) : null}
                  <p className="text-sm text-ink-faint">This project has been reviewed, so the submission is now closed.</p>
                </dl>
              ) : (
                <SubmissionForm
                  projectId={data.id}
                  workUrl={mine?.work_url ?? ""}
                  notes={mine?.notes ?? ""}
                  submitted={status === "submitted"}
                />
              )}
            </div>
          </section>

          {resources.data && resources.data.length > 0 ? (
            <section aria-labelledby="starter">
              <h2 id="starter" className="text-xl font-semibold">Starter resources</h2>
              <div className="mt-4"><ResourceList resources={resources.data} /></div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

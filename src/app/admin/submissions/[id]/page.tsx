import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Markdown } from "@/components/markdown";
import { ProjectStatusBadge } from "@/components/status";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { ReviewForm } from "../../forms";

export const metadata: Metadata = { title: "Review submission" };

interface RubricRow {
  criterion: string;
  description: string;
  points: number;
}

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await requireStaff();
  const zone = viewer.profile.timezone;

  const supabase = await createClient();
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("*, student:profiles(id, full_name, email), project:projects(title, slug, rubric, max_points, due_at)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load this submission: ${error.message}`);
  if (!submission) notFound();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, title, body_md, score, max_score, created_at")
    .eq("submission_id", id)
    .order("created_at", { ascending: false });

  const rubric = (submission.project.rubric as unknown as RubricRow[]) ?? [];
  const late = submission.submitted_at && submission.project.due_at && submission.submitted_at > submission.project.due_at;

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-8">
        <Link href="/admin/submissions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Submissions
        </Link>
        <p className="eyebrow mt-5">{submission.project.title}</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          <Link href={`/admin/students/${submission.student.id}`} className="hover:text-accent">
            {submission.student.full_name}
          </Link>
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <ProjectStatusBadge status={submission.status} />
          {submission.submitted_at ? <span>Submitted {formatDateTime(submission.submitted_at, zone)}</span> : <span>Not submitted yet</span>}
          {submission.project.due_at ? <span>Deadline {formatDateTime(submission.project.due_at, zone)}</span> : null}
          {late ? <span className="font-semibold text-danger">Late</span> : null}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-8">
          <section aria-labelledby="work" className="card p-6">
            <h2 id="work" className="text-xl font-semibold">Submitted work</h2>
            {submission.work_url ? (
              <a href={submission.work_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold break-all text-accent underline underline-offset-4">
                {submission.work_url}
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <p className="mt-3 text-ink-soft">No link provided.</p>
            )}
            <h3 className="mt-5 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Student notes</h3>
            <p className="mt-2 whitespace-pre-wrap">{submission.notes || "None."}</p>
          </section>

          {rubric.length > 0 ? (
            <section aria-labelledby="rubric" className="space-y-3">
              <h2 id="rubric" className="text-xl font-semibold">Rubric</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {rubric.map((row) => (
                  <li key={row.criterion} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="font-semibold">{row.criterion}</p>
                      <p className="text-sm text-ink-soft">{row.description}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{row.points}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-8">
          {feedback && feedback.length > 0 ? (
            <section aria-labelledby="given" className="space-y-3">
              <h2 id="given" className="text-xl font-semibold">Feedback given</h2>
              {feedback.map((item) => (
                <article key={item.id} className="card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold">{item.title}</p>
                    {item.score !== null ? (
                      <p className="font-serif text-lg font-semibold tabular-nums">
                        {Number(item.score)}/{Number(item.max_score)}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm text-ink-faint">{formatDate(item.created_at, zone)}</p>
                  <Markdown className="mt-3 text-[0.97rem] leading-relaxed">{item.body_md}</Markdown>
                </article>
              ))}
            </section>
          ) : null}

          {submission.status === "in_progress" ? (
            <p className="card p-6 text-ink-soft">This is a draft. It can be reviewed once the student submits it.</p>
          ) : (
            <section aria-labelledby="review" className="card p-6">
              <h2 id="review" className="text-xl font-semibold">
                {submission.status === "reviewed" ? "Add further feedback" : "Review"}
              </h2>
              <div className="mt-5">
                <ReviewForm
                  submissionId={submission.id}
                  maxPoints={submission.project.max_points}
                  defaultTitle={`Review: ${submission.project.title}`}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModuleStateBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { getCohort } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { GeneralFeedbackForm } from "../../forms";

export const metadata: Metadata = { title: "Student" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaff();
  const cohort = await getCohort();
  const student = cohort?.students.find((s) => s.profile.id === id);
  if (!student) notFound();

  const supabase = await createClient();
  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, title, kind, score, max_score, read_at, created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const { profile, progress } = student;

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-8">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Overview
        </Link>
        <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">{profile.full_name}</h1>
        <p className="mt-2 text-ink-soft">
          {profile.email} · enrolled {formatDate(student.enrolledAt, viewer.profile.timezone)} · {profile.timezone.replace(/_/g, " ")}
        </p>
        {profile.bio ? <p className="mt-3 max-w-2xl text-ink-soft">{profile.bio}</p> : null}
        <div className="mt-5 flex max-w-md items-center gap-3">
          <ProgressBar value={progress.percent} label="Course completion" />
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {progress.percent}% ({progress.doneItems}/{progress.totalItems})
          </span>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="by-module" className="space-y-4">
          <SectionHeading id="by-module" title="Progress by module" />
          <ol className="space-y-3">
            {progress.moduleProgress.map((item) => (
              <li key={item.module.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {item.module.label}: {item.module.title}
                  </p>
                  <ModuleStateBadge state={item.state} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={item.percent} label={`Module ${item.module.position} completion`} />
                  <span className="w-28 shrink-0 text-right text-sm tabular-nums text-ink-soft">
                    {item.lessonsDone}/{item.module.lessons.length} lessons
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="send" className="card p-6">
            <h2 id="send" className="text-xl font-semibold">Leave general feedback</h2>
            <p className="mt-1 text-sm text-ink-soft">For feedback on a project, review the submission instead.</p>
            <div className="mt-5">
              <GeneralFeedbackForm studentId={profile.id} />
            </div>
          </section>

          <section aria-labelledby="sent" className="space-y-3">
            <SectionHeading id="sent" title="Feedback sent" />
            {feedback && feedback.length > 0 ? (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {feedback.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="text-sm text-ink-faint">
                        {formatDate(item.created_at, viewer.profile.timezone)} · {item.kind}
                        {item.score !== null ? ` · ${Number(item.score)}/${Number(item.max_score)}` : ""}
                      </p>
                    </div>
                    {item.read_at ? <Badge>Read</Badge> : <Badge tone="clay">Unread</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">Nothing sent yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

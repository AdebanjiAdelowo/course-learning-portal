import type { Metadata } from "next";
import Link from "next/link";

import { markAllFeedbackRead, markFeedbackRead } from "@/app/learn/actions/feedback";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { formatDate, formatScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Feedback" };

const kindLabel = { project: "Project", quiz: "Quiz", general: "Course performance" } as const;

export default async function FeedbackPage() {
  const viewer = await requireViewer();
  const { course } = await requireCourseState();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, kind, title, body_md, score, max_score, read_at, created_at, project:projects(title, slug), quiz:quizzes(title, slug), author:profiles!feedback_author_id_fkey(full_name)",
    )
    .eq("student_id", viewer.id)
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load feedback: ${error.message}`);

  const unread = data.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Feedback"
        title="Feedback from your instructor"
        description={
          unread > 0
            ? `You have ${unread} unread ${unread === 1 ? "note" : "notes"}.`
            : "Comments and grades on your projects, quizzes and overall progress."
        }
        actions={
          unread > 0 ? (
            <form action={markAllFeedbackRead}>
              <SubmitButton variant="secondary" pendingLabel="Updating…">
                Mark all as read
              </SubmitButton>
            </form>
          ) : null
        }
      />

      {data.length === 0 ? (
        <EmptyState title="No feedback yet">
          When your instructor reviews a project or leaves a note on your progress, it will appear here.
        </EmptyState>
      ) : (
        <ul className="mx-auto max-w-3xl space-y-5">
          {data.map((item) => {
            const isUnread = !item.read_at;
            const associated = item.project
              ? { label: item.project.title, href: `/learn/projects/${item.project.slug}` }
              : item.quiz
                ? { label: item.quiz.title, href: `/learn/quizzes/${item.quiz.slug}` }
                : null;
            return (
              <li
                key={item.id}
                id={`feedback-${item.id}`}
                className={`card scroll-mt-36 p-6 sm:p-7 ${isUnread ? "border-clay/50 shadow-[inset_3px_0_0_var(--clay)]" : ""}`}
              >
                <article>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="eyebrow">{kindLabel[item.kind]}</p>
                    {isUnread ? <Badge tone="clay">New</Badge> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    {item.score !== null && item.max_score !== null ? (
                      <p className="font-serif text-2xl font-semibold tabular-nums">
                        {formatScore(Number(item.score))}
                        <span className="text-base text-ink-faint">/{formatScore(Number(item.max_score))}</span>
                        <span className="sr-only"> points</span>
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-faint">
                    {item.author?.full_name ?? "Instructor"} · <time dateTime={item.created_at}>{formatDate(item.created_at, viewer.profile.timezone)}</time>
                    {associated ? (
                      <>
                        {" · "}
                        <Link href={associated.href} className="font-semibold text-accent underline-offset-4 hover:underline">
                          {associated.label}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <Markdown className="mt-4">{item.body_md}</Markdown>
                  {isUnread ? (
                    <form action={markFeedbackRead} className="mt-5">
                      <input type="hidden" name="feedback_id" value={item.id} />
                      <SubmitButton variant="secondary" size="sm" pendingLabel="Updating…">
                        Mark as read
                      </SubmitButton>
                    </form>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

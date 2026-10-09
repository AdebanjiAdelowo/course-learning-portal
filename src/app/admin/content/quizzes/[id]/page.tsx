import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/form";
import { requireStaff } from "@/lib/data/viewer";
import { questionToDraft } from "@/lib/domain/authoring";
import type { QuizOption } from "@/lib/domain/quiz";
import { createClient } from "@/lib/supabase/server";

import { deleteQuestion, moveQuestion } from "../../actions";
import { emptyQuestion, QuestionForm, QuizForm } from "../../authoring-forms";
import { CreatedNotice, EditorShell, getModuleOptions } from "../../editor-shell";

export const metadata: Metadata = { title: "Edit quiz" };

const typeNames = {
  multiple_choice: "Multiple choice",
  multiple_select: "Multiple select",
  true_false: "True or false",
  short_answer: "Short answer",
} as const;

/** First line of a prompt, without Markdown or LaTeX delimiters, for the collapsed row. */
function preview(prompt: string): string {
  const line = prompt.split("\n").find((l) => l.trim()) ?? "";
  const plain = line.replace(/[$*_`#]/g, "").trim();
  return plain.length > 90 ? `${plain.slice(0, 90)}…` : plain;
}

export default async function EditQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireStaff();

  const supabase = await createClient();
  const [{ data: quiz }, questions, { count: attempts }, modules] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("questions")
      .select("id, position, type, prompt_md, options, points, key:question_keys(correct, explanation_md)")
      .eq("quiz_id", id)
      .order("position"),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", id),
    getModuleOptions(),
  ]);
  if (!quiz) notFound();
  if (questions.error) throw new Error(`Could not load the questions: ${questions.error.message}`);

  const rows = questions.data;
  const totalPoints = rows.reduce((sum, question) => sum + question.points, 0);

  return (
    <EditorShell eyebrow="Quiz" heading={quiz.title} previewHref={quiz.is_published ? `/learn/quizzes/${quiz.slug}` : undefined}>
      <section aria-labelledby="settings" className="card p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 id="settings" className="text-xl font-semibold">
            Settings
          </h2>
          {quiz.is_published ? <Badge tone="accent">Published</Badge> : <Badge tone="warn">Draft</Badge>}
        </div>
        <QuizForm
          modules={modules}
          notice={created ? <CreatedNotice>Quiz created as a draft. Add questions below, then publish it.</CreatedNotice> : undefined}
          values={{
            id: quiz.id,
            module_id: quiz.module_id,
            title: quiz.title,
            slug: quiz.slug,
            description: quiz.description,
            pass_percent: quiz.pass_percent,
            max_attempts: quiz.max_attempts,
            is_published: quiz.is_published,
          }}
        />
      </section>

      <section aria-labelledby="questions" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="questions" className="text-xl font-semibold">
            Questions
          </h2>
          <p className="text-sm text-ink-faint">
            {rows.length} {rows.length === 1 ? "question" : "questions"} · {totalPoints} {totalPoints === 1 ? "point" : "points"} in total
          </p>
        </div>

        {attempts ? (
          <p className="rounded-lg border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn">
            Students have made {attempts} {attempts === 1 ? "attempt" : "attempts"} at this quiz. Changes apply to new attempts only: past
            scores, and the questions shown in each student&apos;s history, stay as they were.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-ink-soft">No questions yet. Add the first one below.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((question, index) => {
              const options = (question.options as unknown as QuizOption[]) ?? [];
              const draft = questionToDraft(question.type, options, question.key?.correct ?? null);
              return (
                <li key={question.id} className="card">
                  <details>
                    <summary className="flex items-center gap-3 px-5 py-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{preview(question.prompt_md) || "Untitled question"}</span>
                        <span className="block text-sm text-ink-faint">
                          {typeNames[question.type]} · {question.points} {question.points === 1 ? "point" : "points"}
                        </span>
                      </span>
                      {question.key ? null : <Badge tone="danger">No answer key</Badge>}
                    </summary>
                    <div className="border-t border-line p-5">
                      <QuestionForm
                        quizId={quiz.id}
                        values={{
                          id: question.id,
                          type: question.type,
                          prompt_md: question.prompt_md,
                          options_text: draft.optionsText,
                          true_false: draft.trueFalse,
                          accepted_text: draft.acceptedText,
                          explanation_md: question.key?.explanation_md ?? "",
                          points: question.points,
                        }}
                      />
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                        <form action={moveQuestion}>
                          <input type="hidden" name="id" value={question.id} />
                          <input type="hidden" name="direction" value="up" />
                          <SubmitButton variant="ghost" size="sm" disabled={index === 0} aria-label={`Move question ${index + 1} up`}>
                            <ArrowUp className="size-4" aria-hidden="true" />
                            Move up
                          </SubmitButton>
                        </form>
                        <form action={moveQuestion}>
                          <input type="hidden" name="id" value={question.id} />
                          <input type="hidden" name="direction" value="down" />
                          <SubmitButton variant="ghost" size="sm" disabled={index === rows.length - 1} aria-label={`Move question ${index + 1} down`}>
                            <ArrowDown className="size-4" aria-hidden="true" />
                            Move down
                          </SubmitButton>
                        </form>
                        <div className="flex-1" />
                        <form action={deleteQuestion}>
                          <input type="hidden" name="id" value={question.id} />
                          <SubmitButton
                            variant="danger"
                            size="sm"
                            pendingLabel="Deleting…"
                            disabled={quiz.is_published && rows.length === 1}
                            aria-label={`Delete question ${index + 1}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                      {quiz.is_published && rows.length === 1 ? (
                        <p className="mt-2 text-sm text-ink-faint">A published quiz needs at least one question. Unpublish it to delete this one.</p>
                      ) : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="add-question" className="card p-6 sm:p-7">
        <h2 id="add-question" className="mb-5 text-xl font-semibold">
          Add a question
        </h2>
        <QuestionForm quizId={quiz.id} values={emptyQuestion} />
      </section>
    </EditorShell>
  );
}

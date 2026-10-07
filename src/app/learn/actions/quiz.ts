"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { gradeQuiz, toStoredResults, type AnswerKey, type AnswerValue, type QuizOption } from "@/lib/domain/quiz";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { quizSubmissionSchema } from "@/lib/validation";

export interface QuizActionState {
  error: string | null;
}

/**
 * Grades and records a quiz attempt.
 *
 * Students have no insert privilege on `quiz_attempts` and cannot read `question_keys`, so the
 * only way to obtain a score is through this action: it authorises the caller with their own
 * session, then uses the service role to read the keys and write the graded attempt.
 */
export async function submitQuiz(input: {
  quizId: string;
  answers: Record<string, AnswerValue>;
}): Promise<QuizActionState> {
  const viewer = await requireViewer();
  const parsed = quizSubmissionSchema.safeParse({ quiz_id: input.quizId, answers: input.answers });
  if (!parsed.success) return { error: "Your answers could not be read. Please try again." };

  // Authorisation: the quiz must be in the viewer's course and in an unlocked module.
  const state = await getCourseState();
  const quiz = state?.quizzes.find((q) => q.id === parsed.data.quiz_id);
  const owner = quiz && state?.progress.moduleProgress.find((m) => m.module.id === quiz.module_id);
  if (!quiz || !owner) return { error: "That quiz is not part of your course." };
  if (owner.state === "locked") return { error: "That quiz is still locked." };

  const admin = createAdminClient();
  const [questions, previous] = await Promise.all([
    admin
      .from("questions")
      .select("id, position, type, prompt_md, options, points, key:question_keys(correct, explanation_md)")
      .eq("quiz_id", quiz.id)
      .order("position"),
    admin
      .from("quiz_attempts")
      .select("attempt_number")
      .eq("quiz_id", quiz.id)
      .eq("user_id", viewer.id)
      .order("attempt_number", { ascending: false })
      .limit(1),
  ]);
  if (questions.error || previous.error) return { error: "The quiz could not be graded. Please try again." };
  if (questions.data.length === 0) return { error: "This quiz has no questions yet." };

  const attemptNumber = (previous.data[0]?.attempt_number ?? 0) + 1;
  if (quiz.max_attempts !== null && attemptNumber > quiz.max_attempts) {
    return { error: "You have used all your attempts for this quiz." };
  }

  const keys = new Map<string, AnswerKey>();
  for (const question of questions.data) {
    if (!question.key) return { error: "This quiz is not fully set up yet. Please tell your instructor." };
    keys.set(question.id, { correct: question.key.correct, explanation: question.key.explanation_md });
  }

  const grade = gradeQuiz(questions.data, keys, parsed.data.answers, quiz.pass_percent);

  const results = toStoredResults(
    grade,
    questions.data.map((question) => ({
      id: question.id,
      type: question.type,
      points: question.points,
      prompt: question.prompt_md,
      options: (question.options as unknown as QuizOption[]) ?? [],
    })),
  );

  const { data: attempt, error } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      user_id: viewer.id,
      attempt_number: attemptNumber,
      answers: parsed.data.answers as NonNullable<Json>,
      results: results as unknown as NonNullable<Json>,
      score: grade.score,
      max_score: grade.maxScore,
      percent: grade.percent,
      passed: grade.passed,
    })
    .select("id")
    .single();
  if (error) {
    // 23505: two submissions raced for the same attempt number.
    return {
      error:
        error.code === "23505"
          ? "This attempt was already submitted. Refresh the page to see your result."
          : "Your attempt could not be saved. Please try again.",
    };
  }

  revalidatePath("/learn", "layout");
  redirect(`/learn/quizzes/${quiz.slug}/attempts/${attempt.id}`);
}

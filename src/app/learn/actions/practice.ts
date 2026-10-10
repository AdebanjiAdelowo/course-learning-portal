"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { checkCode, practiceLimitMessage, PRACTICE_LIMITS } from "@/lib/domain/practice";
import { createClient } from "@/lib/supabase/server";
import { invalidState, type FormState } from "@/lib/validation";

const schema = z.object({
  problem_id: z.uuid(),
  intent: z.enum(["save", "submit"]),
  // A little slack over the stored limit, so that normalising line endings decides, not this.
  code: z.string().max(PRACTICE_LIMITS.maxCodeLength * 2, "Your solution is too long."),
});

const failed = (message: string): FormState => ({ status: "error", message });
const codeError = (message: string): FormState => ({
  status: "error",
  message: "Your code was not saved.",
  fieldErrors: { code: [message] },
});

/**
 * Saves a draft of a solution, or records it as a submitted attempt.
 *
 * The code is stored as text and nothing else happens to it: it is never executed, here or in
 * the database, and it is never marked as correct. Row-level security independently guarantees
 * that a student writes only their own rows and only for problems they can open, and a database
 * trigger enforces the attempt limits whatever this action does.
 */
export async function saveCode(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = schema.safeParse({
    problem_id: formData.get("problem_id"),
    intent: formData.get("intent"),
    code: formData.get("code") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error, "Your code was not saved.");
  const { problem_id, intent } = parsed.data;

  // Authorisation: the problem must be in the viewer's course and in an unlocked module.
  const state = await getCourseState();
  const problem = state?.problems.find((p) => p.id === problem_id);
  const owner = problem && state?.progress.moduleProgress.find((m) => m.module.id === problem.module_id);
  if (!problem || !owner) return failed("That problem is not part of your course.");
  if (owner.state === "locked") return failed("That problem is still locked.");

  const supabase = await createClient();
  const { data: full, error: readError } = await supabase
    .from("coding_problems")
    .select("starter_code")
    .eq("id", problem.id)
    .maybeSingle();
  if (readError || !full) return failed("That problem could not be opened. Please try again.");

  const checked = checkCode(parsed.data.code, { intent, starter: full.starter_code });
  if (!checked.ok) return codeError(checked.error);
  const { code } = checked;

  // The working draft: one row per student and problem, updated in place.
  const saveDraft = async () => {
    const { data: draft, error } = await supabase
      .from("code_submissions")
      .select("id")
      .eq("problem_id", problem.id)
      .eq("user_id", viewer.id)
      .eq("status", "draft")
      .maybeSingle();
    if (error) return error;
    if (draft) return (await supabase.from("code_submissions").update({ code }).eq("id", draft.id)).error;
    return (await supabase.from("code_submissions").insert({ problem_id: problem.id, user_id: viewer.id, code, status: "draft" })).error;
  };

  let draftError = await saveDraft();
  // 23505: two saves raced to create the draft. The row exists now, so update it.
  if (draftError?.code === "23505") draftError = await saveDraft();
  if (draftError) return failed("Your draft could not be saved. Please try again.");

  if (intent === "save") {
    revalidatePath("/learn", "layout");
    return { status: "success", message: "Draft saved. It has not been submitted." };
  }

  // A submitted attempt is a separate, frozen copy added to the history.
  const { error: submitError } = await supabase
    .from("code_submissions")
    .insert({ problem_id: problem.id, user_id: viewer.id, code, status: "submitted" });
  if (submitError) {
    revalidatePath("/learn", "layout");
    return failed(practiceLimitMessage(submitError.message) ?? "Your draft was saved, but the attempt could not be recorded. Please try again.");
  }

  revalidatePath("/learn", "layout");
  return {
    status: "success",
    message:
      "Submitted for self-review. Your code was saved to your history; it has not been run or graded. The editorial is now open: compare it with your solution.",
  };
}

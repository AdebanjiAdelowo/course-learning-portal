"use server";

import { revalidatePath } from "next/cache";

import { getCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { invalidState, submissionSchema, type FormState } from "@/lib/validation";

/**
 * Saves a draft or submits a project for review. Row-level security independently guarantees
 * that a student can only write their own submission and can never mark it as reviewed.
 */
export async function saveSubmission(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = submissionSchema.safeParse({
    project_id: formData.get("project_id"),
    intent: formData.get("intent"),
    work_url: formData.get("work_url") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error);
  const { project_id, intent, work_url, notes } = parsed.data;

  const state = await getCourseState();
  const project = state?.projects.find((p) => p.id === project_id);
  const owner = project && state?.progress.moduleProgress.find((m) => m.module.id === project.module_id);
  if (!project || !owner) return { status: "error", message: "That project is not part of your course." };
  if (owner.state === "locked") return { status: "error", message: "That project is still locked." };

  const existing = state?.submissions.find((s) => s.project_id === project_id);
  if (existing?.status === "reviewed") {
    return { status: "error", message: "This project has been reviewed and can no longer be changed." };
  }

  const status = intent === "submit" ? "submitted" : "in_progress";
  const supabase = await createClient();
  const { error } = existing
    ? await supabase.from("submissions").update({ status, work_url, notes }).eq("id", existing.id)
    : await supabase.from("submissions").insert({ project_id, user_id: viewer.id, status, work_url, notes });
  if (error) return { status: "error", message: "Your work could not be saved. Please try again." };

  revalidatePath("/learn", "layout");
  return {
    status: "success",
    message:
      intent === "submit"
        ? "Submitted. Your instructor will review it and you will see feedback here."
        : "Draft saved. Submit it when you are ready for review.",
  };
}

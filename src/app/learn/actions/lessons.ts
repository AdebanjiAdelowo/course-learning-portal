"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ lesson_id: z.uuid(), complete: z.enum(["true", "false"]) });

/**
 * Marks a lesson complete (or not). Completion is a row in `lesson_progress`, so it survives
 * refreshes, sign-outs and device changes. Lessons in locked modules cannot be marked.
 */
export async function setLessonComplete(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const parsed = schema.safeParse({
    lesson_id: formData.get("lesson_id"),
    complete: formData.get("complete"),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const state = await getCourseState();
  const owner = state?.progress.moduleProgress.find((m) =>
    m.module.lessons.some((lesson) => lesson.id === parsed.data.lesson_id),
  );
  if (!owner) throw new Error("That lesson is not part of your course.");
  if (owner.state === "locked") throw new Error("That lesson is still locked.");

  const supabase = await createClient();
  const { error } =
    parsed.data.complete === "true"
      ? await supabase
          .from("lesson_progress")
          .upsert(
            { user_id: viewer.id, lesson_id: parsed.data.lesson_id },
            { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", viewer.id)
          .eq("lesson_id", parsed.data.lesson_id);
  if (error) throw new Error(`Could not save your progress: ${error.message}`);

  revalidatePath("/learn", "layout");
}

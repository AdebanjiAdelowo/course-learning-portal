"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

/** Marks all of the viewer's unread feedback as read (the database function checks ownership). */
export async function markAllFeedbackRead(): Promise<void> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: unread, error } = await supabase
    .from("feedback")
    .select("id")
    .eq("student_id", viewer.id)
    .is("read_at", null);
  if (error) throw new Error(`Could not update feedback: ${error.message}`);
  if (unread.length === 0) return;

  const { error: rpcError } = await supabase.rpc("mark_feedback_read", {
    p_feedback_ids: unread.map((row) => row.id),
  });
  if (rpcError) throw new Error(`Could not update feedback: ${rpcError.message}`);
  revalidatePath("/learn", "layout");
}

export async function markFeedbackRead(formData: FormData): Promise<void> {
  await requireViewer();
  const id = formData.get("feedback_id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_feedback_read", { p_feedback_ids: [id] });
  if (error) throw new Error(`Could not update feedback: ${error.message}`);
  revalidatePath("/learn", "layout");
}

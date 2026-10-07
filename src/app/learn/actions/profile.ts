"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { invalidState, profileSchema, type FormState } from "@/lib/validation";

/** Updates the fields a student owns. Role and email are not writable through this path. */
export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    timezone: formData.get("timezone"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, bio: parsed.data.bio || null })
    .eq("id", viewer.id);
  if (error) return { status: "error", message: "Your profile could not be saved. Please try again." };

  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}

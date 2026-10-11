"use server";

import { revalidatePath } from "next/cache";

import { requireStaff, requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { parseLinksText } from "@/lib/domain/profile";
import type { Json } from "@/lib/supabase/database.types";
import { invalidState, profileSchema, publicProfileSchema, type FormState } from "@/lib/validation";

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

/**
 * Updates what the public website shows about the instructor. Staff only. Links must be plain
 * https addresses; the same rule is enforced again by a database constraint.
 */
export async function updatePublicProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const parsed = publicProfileSchema.safeParse({
    headline: formData.get("headline") ?? "",
    avatar_url: formData.get("avatar_url") ?? "",
    links_text: formData.get("links_text") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error);

  const links = parseLinksText(parsed.data.links_text);
  if (!links.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: { links_text: [links.error] } };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      headline: parsed.data.headline || null,
      avatar_url: parsed.data.avatar_url || null,
      links: links.value as unknown as NonNullable<Json>,
    })
    .eq("id", viewer.id);
  if (error) return { status: "error", message: "Your public profile could not be saved. Please try again." };

  revalidatePath("/", "layout");
  return { status: "success", message: "Public profile saved." };
}

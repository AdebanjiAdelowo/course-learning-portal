"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, invalidState, type FormState } from "@/lib/validation";

/**
 * Stores a message from the public contact form. Anonymous visitors have no database
 * privileges at all, so the validated message is written with the service role.
 */
export async function sendContactMessage(_previous: FormState, formData: FormData): Promise<FormState> {
  const success: FormState = {
    status: "success",
    message: "Thank you. Your message has reached the course team and we will reply by email.",
  };

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if ((formData.get("website") ?? "") !== "") return success;

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  try {
    const { error } = await createAdminClient().from("contact_messages").insert(parsed.data);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Contact form failed:", error);
    return { status: "error", message: "Your message could not be sent. Please email us directly instead." };
  }
  return success;
}

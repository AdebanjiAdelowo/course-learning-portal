"use server";

import { headers } from "next/headers";

import { clientAddress, withinRateLimits, type RateLimitRule } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, invalidState, type FormState } from "@/lib/validation";

/**
 * Stores a message from the public contact form. Anonymous visitors have no database
 * privileges at all, so the validated message is written with the service role.
 *
 * Abuse protection, all enforced on the server: a honeypot field, strict validation, and three
 * rate limits counted in the database (per address, per email, and for the whole site).
 */
const HOUR = 3600;
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

  const address = clientAddress(await headers());
  const rules: RateLimitRule[] = [
    ...(address ? [{ bucket: "contact:ip", key: address, limit: 5, windowSeconds: HOUR }] : []),
    { bucket: "contact:email", key: parsed.data.email, limit: 3, windowSeconds: HOUR },
    // A ceiling for the whole form, which also bounds requests that carry no usable address.
    { bucket: "contact:all", key: "all", limit: 60, windowSeconds: HOUR },
  ];
  if (!(await withinRateLimits(rules))) {
    return { status: "error", message: "Too many messages have been sent in the last hour. Please try again later." };
  }

  try {
    const { error } = await createAdminClient().from("contact_messages").insert(parsed.data);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Contact form failed:", error);
    return { status: "error", message: "Your message could not be sent. Please try again in a few minutes." };
  }
  return success;
}

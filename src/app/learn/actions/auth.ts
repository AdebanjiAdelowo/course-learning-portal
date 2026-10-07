"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { requireViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/supabase/session";
import {
  forgotPasswordSchema,
  invalidState,
  loginSchema,
  updatePasswordSchema,
  type FormState,
} from "@/lib/validation";

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // One message for every failure, so the form never reveals which emails have accounts.
    const message =
      error.status === 429
        ? "Too many attempts. Please wait a few minutes and try again."
        : "That email and password do not match an account.";
    return { status: "error", message };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function requestPasswordReset(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv().siteUrl}/auth/confirm?next=/learn/update-password`,
  });
  if (error?.status === 429) {
    return { status: "error", message: "Too many requests. Please wait a few minutes and try again." };
  }

  // Same answer whether or not the address is registered.
  return {
    status: "success",
    message: "If that address has an account, a reset link is on its way. It expires in one hour.",
  };
}

export async function updatePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireViewer();
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "same_password"
          ? "Choose a password you have not used for this account before."
          : "We could not update your password. Please try again.",
    };
  }
  return { status: "success", message: "Your password has been updated." };
}

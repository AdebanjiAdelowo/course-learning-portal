"use client";

import { requestPasswordReset } from "@/app/learn/actions/auth";
import { FormMessage, SubmitButton, TextField, useServerForm } from "@/components/ui/form";
import type { FormState } from "@/lib/validation";

const expiredState: FormState = {
  status: "error",
  message: "That link has expired or was already used. Request a new one below.",
};

export function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const { state, pending, formProps } = useServerForm(requestPasswordReset, linkExpired ? { initialState: expiredState } : {});

  return (
    <form {...formProps} className="space-y-5">
      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

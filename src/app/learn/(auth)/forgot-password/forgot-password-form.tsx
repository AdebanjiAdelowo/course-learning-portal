"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/app/learn/actions/auth";
import { FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { idleState, type FormState } from "@/lib/validation";

const expiredState: FormState = {
  status: "error",
  message: "That link has expired or was already used. Request a new one below.",
};

export function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const [state, action] = useActionState(requestPasswordReset, linkExpired ? expiredState : idleState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

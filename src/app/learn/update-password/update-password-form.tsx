"use client";

import { updatePassword } from "@/app/learn/actions/auth";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage, SubmitButton, TextField, useServerForm } from "@/components/ui/form";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function UpdatePasswordForm() {
  const { state, pending, formProps } = useServerForm(updatePassword);

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <ButtonLink href="/learn" size="lg" className="w-full">
          Go to your dashboard
        </ButtonLink>
      </div>
    );
  }

  return (
    <form {...formProps} className="space-y-5">
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={state.fieldErrors?.password}
      />
      <TextField
        label="Repeat new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirm}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

"use client";

import Link from "next/link";

import { signIn } from "@/app/learn/actions/auth";
import { FormMessage, SubmitButton, TextField, useServerForm } from "@/components/ui/form";

export function LoginForm({ next }: { next: string }) {
  const { state, pending, formProps } = useServerForm(signIn);

  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <div>
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
        <p className="mt-2 text-right text-sm">
          <Link href="/learn/forgot-password" className="font-semibold text-accent underline underline-offset-4">
            Forgot your password?
          </Link>
        </p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

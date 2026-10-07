"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/learn/actions/auth";
import { FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { idleState } from "@/lib/validation";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, idleState);

  return (
    <form action={action} className="space-y-5" noValidate>
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
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

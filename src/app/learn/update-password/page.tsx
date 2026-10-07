import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { requireViewer } from "@/lib/data/viewer";

import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from a reset or invitation email, after /auth/confirm has created the session. */
export default async function UpdatePasswordPage() {
  const viewer = await requireViewer();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Brand href="/learn" />
        <ButtonLink href="/learn" variant="ghost" size="sm">
          Skip for now
        </ButtonLink>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-20 pt-6">
        <AuthCard
          eyebrow="Account security"
          title="Choose a new password"
          description={`Signed in as ${viewer.profile.email}.`}
        >
          <UpdatePasswordForm />
        </AuthCard>
      </main>
    </div>
  );
}

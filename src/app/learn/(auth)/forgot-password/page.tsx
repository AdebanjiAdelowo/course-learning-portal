import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthCard
      eyebrow="Learning portal"
      title="Reset your password"
      description="Enter the email address you were enrolled with and we will send you a link to choose a new password."
      footer={
        <Link href="/learn/login" className="font-semibold text-accent underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm linkExpired={error === "expired"} />
    </AuthCard>
  );
}

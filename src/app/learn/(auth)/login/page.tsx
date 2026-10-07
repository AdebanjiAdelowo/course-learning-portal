import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { safeNextPath } from "@/lib/supabase/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthCard
      eyebrow="Learning portal"
      title="Sign in"
      description="Pick up where you left off: lessons, projects, quizzes, live sessions and feedback."
      footer={
        <>
          Accounts are issued to enrolled students.{" "}
          <Link href="/contact" className="font-semibold text-accent underline underline-offset-4">
            Contact the course team
          </Link>
        </>
      }
    >
      <LoginForm next={safeNextPath(next)} />
    </AuthCard>
  );
}

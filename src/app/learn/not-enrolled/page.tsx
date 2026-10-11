import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { Brand } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getActiveCourse } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "No active enrolment" };

export default async function NotEnrolledPage() {
  const viewer = await requireViewer();
  if (await getActiveCourse()) redirect("/learn");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-5">
        <Brand />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-20 pt-6">
        <AuthCard
          eyebrow="Learning portal"
          title="No active enrolment"
          description={`You are signed in as ${viewer.profile.email}, but this account is not enrolled in a course yet.`}
        >
          <p className="text-ink-soft">
            If you expected to see your course here,{" "}
            <a
              href={siteConfig.supportEmail ? `mailto:${siteConfig.supportEmail}` : "/contact"}
              className="font-semibold text-accent underline underline-offset-4"
            >
              {siteConfig.supportEmail ? `write to ${siteConfig.supportEmail}` : "contact the course team"}
            </a>{" "}
            and we will sort it out.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {viewer.isStaff ? <ButtonLink href="/admin">Open the instructor area</ButtonLink> : null}
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </AuthCard>
      </main>
    </div>
  );
}

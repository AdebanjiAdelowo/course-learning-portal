import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Profile and settings" };

const roleLabel = { student: "Student", instructor: "Instructor", admin: "Administrator" } as const;

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const { course } = await requireCourseState();
  const { profile } = viewer;

  const supabase = await createClient();
  const { data: enrolment } = await supabase
    .from("enrollments")
    .select("status, enrolled_at")
    .eq("user_id", viewer.id)
    .eq("course_id", course.id)
    .maybeSingle();

  // Server and browser share the same list, so the select never mismatches on hydration.
  const zones = Intl.supportedValuesOf("timeZone");
  const zoneOptions = zones.includes(profile.timezone) ? zones : [profile.timezone, ...zones];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader eyebrow="Account" title="Profile and settings" />

      <section aria-labelledby="account" className="card p-6 sm:p-7">
        <h2 id="account" className="text-xl font-semibold">Account</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-faint">Email</dt>
            <dd className="font-semibold break-all">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Role</dt>
            <dd className="font-semibold">{roleLabel[profile.role]}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Course</dt>
            <dd className="font-semibold">{course.title}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Enrolment</dt>
            <dd className="font-semibold">
              {enrolment
                ? `${enrolment.status === "completed" ? "Completed" : "Active"} since ${formatDate(enrolment.enrolled_at, profile.timezone)}`
                : "Staff preview"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink-faint">To change your email address, contact the course team.</p>
      </section>

      <section aria-labelledby="profile" className="card p-6 sm:p-7">
        <h2 id="profile" className="text-xl font-semibold">Profile</h2>
        <div className="mt-5">
          <ProfileForm fullName={profile.full_name} timezone={profile.timezone} bio={profile.bio ?? ""} zones={zoneOptions} />
        </div>
      </section>

      <section aria-labelledby="password" className="card p-6 sm:p-7">
        <h2 id="password" className="text-xl font-semibold">Password</h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>

      <section aria-labelledby="signout" className="card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
        <div>
          <h2 id="signout" className="text-xl font-semibold">Sign out</h2>
          <p className="mt-1 text-ink-soft">Your progress is saved to your account and will be here when you return.</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="h-11 rounded-lg border border-line-strong bg-surface px-4 font-semibold hover:border-ink-faint hover:bg-sunken">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}

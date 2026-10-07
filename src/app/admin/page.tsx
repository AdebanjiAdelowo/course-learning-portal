import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { getCohort } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const viewer = await requireStaff();
  const cohort = await getCohort();
  if (!cohort) {
    return (
      <EmptyState title="No course yet">
        Load a course with <code className="font-mono text-sm">npm run seed:content</code>, then come back here.
      </EmptyState>
    );
  }

  const supabase = await createClient();
  const [{ count: awaiting }, { count: messages }] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
  ]);

  const { students, course } = cohort;
  const average = students.length
    ? Math.round(students.reduce((sum, s) => sum + s.progress.percent, 0) / students.length)
    : 0;

  const stats = [
    { label: "Enrolled students", value: String(students.length), detail: course.title },
    { label: "Average completion", value: `${average}%`, detail: "Same formula as the student dashboard" },
    { label: "Awaiting review", value: String(awaiting ?? 0), detail: "Submitted projects without feedback" },
    { label: "Contact messages", value: String(messages ?? 0), detail: "From the public contact form" },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Instructor area"
        title="Cohort overview"
        description={course.title}
        actions={
          (awaiting ?? 0) > 0 ? <ButtonLink href="/admin/submissions">Review submissions ({awaiting})</ButtonLink> : null
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <dt className="eyebrow">{stat.label}</dt>
            <dd className="mt-2 font-serif text-3xl font-semibold tabular-nums">{stat.value}</dd>
            <dd className="mt-1 text-sm text-ink-soft">{stat.detail}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="students" className="space-y-4">
        <SectionHeading id="students" title="Student progress" />
        {students.length === 0 ? (
          <EmptyState title="No students enrolled">Enrol students by creating their accounts and adding an enrolment row. See the README.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-line text-ink-faint">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Student</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Completion</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Lessons</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Quizzes passed</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Projects</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map(({ profile, progress, lastActivity }) => (
                  <tr key={profile.id}>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <Link href={`/admin/students/${profile.id}`} className="font-semibold hover:text-accent">
                        {profile.full_name}
                      </Link>
                      <span className="block text-ink-faint">{profile.email}</span>
                    </th>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={progress.percent} label={`Completion for ${profile.full_name}`} className="w-24" />
                        <span className="font-semibold tabular-nums">{progress.percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{progress.lessons.done}/{progress.lessons.total}</td>
                    <td className="px-4 py-3 tabular-nums">{progress.quizzes.passed}/{progress.quizzes.total}</td>
                    <td className="px-4 py-3 tabular-nums">{progress.projects.submitted}/{progress.projects.total}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {lastActivity ? formatDate(lastActivity, viewer.profile.timezone) : "None yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

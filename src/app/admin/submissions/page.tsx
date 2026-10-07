import type { Metadata } from "next";
import Link from "next/link";

import { ProjectStatusBadge } from "@/components/status";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getAdminCourse, NIL_UUID } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const viewer = await requireStaff();
  const course = await getAdminCourse();
  const all = show === "all";

  const supabase = await createClient();
  let query = supabase
    .from("submissions")
    .select("id, status, submitted_at, updated_at, student:profiles(full_name, email), project:projects!inner(title, course_id, due_at)")
    .eq("project.course_id", course?.id ?? NIL_UUID)
    .order("submitted_at", { ascending: true, nullsFirst: false });
  if (!all) query = query.eq("status", "submitted");
  const { data, error } = await query;
  if (error) throw new Error(`Could not load submissions: ${error.message}`);

  const tab = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-semibold",
      active ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:text-ink",
    );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Instructor area" title="Submissions" description="Oldest first, so nobody waits longer than they should." />
      <nav aria-label="Filter submissions" className="flex gap-2">
        <Link href="/admin/submissions" aria-current={all ? undefined : "true"} className={tab(!all)}>
          Awaiting review
        </Link>
        <Link href="/admin/submissions?show=all" aria-current={all ? "true" : undefined} className={tab(all)}>
          All
        </Link>
      </nav>

      {data.length === 0 ? (
        <EmptyState title={all ? "No submissions yet" : "Nothing is waiting for review"}>
          {all ? "Student work will appear here once it is saved or submitted." : "New submissions will appear here."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {data.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/submissions/${row.id}`} className="group flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-sunken">
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-accent">{row.project.title}</span>
                  <span className="block text-sm text-ink-soft">
                    {row.student.full_name} ·{" "}
                    {row.submitted_at
                      ? `submitted ${formatDateTime(row.submitted_at, viewer.profile.timezone)}`
                      : `draft, last saved ${formatDateTime(row.updated_at, viewer.profile.timezone)}`}
                    {row.submitted_at && row.project.due_at && row.submitted_at > row.project.due_at ? " · late" : ""}
                  </span>
                </span>
                <ProjectStatusBadge status={row.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

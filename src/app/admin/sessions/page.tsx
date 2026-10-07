import type { Metadata } from "next";

import { SessionStatusBadge } from "@/components/status";
import { SubmitButton } from "@/components/ui/form";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { getAdminCourse, NIL_UUID } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { sessionStatus } from "@/lib/domain/sessions";
import { formatDateTime, zoneLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { deleteItem } from "../actions";
import { SessionForm } from "../forms";

export const metadata: Metadata = { title: "Live sessions" };

export default async function AdminSessionsPage() {
  const viewer = await requireStaff();
  const course = await getAdminCourse();
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("id, title, starts_at, ends_at, timezone, instructor_name")
    .eq("course_id", course?.id ?? NIL_UUID)
    .order("starts_at", { ascending: false });

  const zones = Intl.supportedValuesOf("timeZone");
  const now = new Date();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Instructor area" title="Live sessions" description="Students see each session in their own time zone." />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="scheduled" className="space-y-4">
          <SectionHeading id="scheduled" title="Scheduled and past" />
          {sessions && sessions.length > 0 ? (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {sessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{session.title}</p>
                    <p className="text-sm text-ink-soft">
                      {formatDateTime(session.starts_at, session.timezone)} · {zoneLabel(session.starts_at, session.timezone)} · {session.instructor_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SessionStatusBadge status={sessionStatus(session.starts_at, session.ends_at, now)} />
                    <form action={deleteItem}>
                      <input type="hidden" name="table" value="live_sessions" />
                      <input type="hidden" name="id" value={session.id} />
                      <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…" aria-label={`Delete ${session.title}`}>
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">No sessions yet.</p>
          )}
        </section>
        <section aria-labelledby="schedule" className="card h-fit p-6">
          <h2 id="schedule" className="text-xl font-semibold">Schedule a session</h2>
          <div className="mt-5">
            <SessionForm zones={zones} defaultZone={viewer.profile.timezone} defaultHost={viewer.profile.full_name} />
          </div>
        </section>
      </div>
    </div>
  );
}

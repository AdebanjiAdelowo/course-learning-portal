import { Pin } from "lucide-react";
import type { Metadata } from "next";

import { Markdown } from "@/components/markdown";
import { SubmitButton } from "@/components/ui/form";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { getAdminCourse, NIL_UUID } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { deleteItem } from "../actions";
import { AnnouncementForm } from "../forms";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const viewer = await requireStaff();
  const course = await getAdminCourse();
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body_md, pinned, published_at")
    .eq("course_id", course?.id ?? NIL_UUID)
    .order("published_at", { ascending: false });

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Instructor area" title="Announcements" description="Shown on every student's dashboard, pinned ones first." />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="published" className="space-y-4">
          <SectionHeading id="published" title="Published" />
          {announcements && announcements.length > 0 ? (
            <ul className="space-y-4">
              {announcements.map((item) => (
                <li key={item.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        {item.pinned ? <Pin className="size-4 text-clay" aria-label="Pinned" /> : null}
                        {item.title}
                      </p>
                      <p className="text-sm text-ink-faint">{formatDate(item.published_at, viewer.profile.timezone)}</p>
                    </div>
                    <form action={deleteItem}>
                      <input type="hidden" name="table" value="announcements" />
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…" aria-label={`Delete ${item.title}`}>
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                  <Markdown className="mt-3 text-[0.97rem] leading-relaxed text-ink-soft">{item.body_md}</Markdown>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">No announcements yet.</p>
          )}
        </section>
        <section aria-labelledby="new" className="card h-fit p-6">
          <h2 id="new" className="text-xl font-semibold">New announcement</h2>
          <div className="mt-5">
            <AnnouncementForm />
          </div>
        </section>
      </div>
    </div>
  );
}

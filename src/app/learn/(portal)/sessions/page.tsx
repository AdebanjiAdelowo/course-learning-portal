import { ExternalLink, FileText, PlayCircle, Presentation } from "lucide-react";
import type { Metadata } from "next";

import { Markdown } from "@/components/markdown";
import { ResourceList } from "@/components/resource-list";
import { SessionStatusBadge } from "@/components/status";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { sessionStatus, type SessionStatus } from "@/lib/domain/sessions";
import { formatLongDate, formatTime, relativeDays, zoneLabel } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Live sessions" };

type Resource = Pick<Tables<"resources">, "id" | "title" | "description" | "kind" | "url" | "live_session_id">;

function SessionCard({
  session,
  status,
  zone,
  resources,
  now,
}: {
  session: Tables<"live_sessions">;
  status: SessionStatus;
  zone: string;
  resources: Resource[];
  now: Date;
}) {
  const sameZone = zone === session.timezone;
  return (
    <li className="card p-6">
      <div className="flex flex-col gap-5 md:flex-row md:gap-8">
        <div className="shrink-0 md:w-56">
          <SessionStatusBadge status={status} />
          <p className="mt-3 font-serif text-lg font-semibold leading-snug">
            <time dateTime={session.starts_at}>{formatLongDate(session.starts_at, zone)}</time>
          </p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatTime(session.starts_at, zone)} to {formatTime(session.ends_at, zone)}
          </p>
          <p className="text-sm text-ink-faint">{zoneLabel(session.starts_at, zone)}</p>
          {sameZone ? null : (
            <p className="mt-1 text-sm text-ink-faint">
              {formatTime(session.starts_at, session.timezone)} in {zoneLabel(session.starts_at, session.timezone)}
            </p>
          )}
          {status === "upcoming" ? (
            <p className="mt-2 text-sm font-semibold text-accent">Starts {relativeDays(session.starts_at, now)}</p>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 md:border-l md:border-line md:pl-8">
          <h3 className="text-xl font-semibold">{session.title}</h3>
          <p className="mt-1 text-sm text-ink-faint">Hosted by {session.instructor_name}</p>
          {session.description ? <p className="mt-3 text-ink-soft">{session.description}</p> : null}

          {status !== "completed" && session.meeting_url ? (
            <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className={buttonClass(status === "live" ? "primary" : "secondary", "md", "mt-5")}>
              {status === "live" ? "Join now" : "Open meeting link"}
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}

          {status === "completed" ? (
            <div className="mt-5 space-y-5">
              {session.recording_url || session.slides_url ? (
                <div className="flex flex-wrap gap-3">
                  {session.recording_url ? (
                    <a href={session.recording_url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                      <PlayCircle className="size-4" aria-hidden="true" />
                      Watch recording
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                  {session.slides_url ? (
                    <a
                      href={session.slides_url}
                      {...(session.slides_url.startsWith("/") ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                      className={buttonClass("secondary", "sm")}
                    >
                      <Presentation className="size-4" aria-hidden="true" />
                      Slides
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">The recording will be added here once it has been processed.</p>
              )}
              {session.notes_md ? (
                <details className="rounded-lg border border-line bg-paper">
                  <summary className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
                    <FileText className="size-4 text-accent" aria-hidden="true" />
                    Session notes
                  </summary>
                  <Markdown className="border-t border-line px-4 py-4 text-[0.97rem] leading-relaxed">{session.notes_md}</Markdown>
                </details>
              ) : null}
              {resources.length > 0 ? (
                <div>
                  <p className="eyebrow mb-2">Supplementary resources</p>
                  <ResourceList resources={resources} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default async function SessionsPage() {
  const viewer = await requireViewer();
  const { course } = await requireCourseState();
  const zone = viewer.profile.timezone;
  const now = new Date();

  const supabase = await createClient();
  const [sessions, resources] = await Promise.all([
    supabase.from("live_sessions").select("*").eq("course_id", course.id).order("starts_at"),
    supabase
      .from("resources")
      .select("id, title, description, kind, url, live_session_id")
      .eq("course_id", course.id)
      .not("live_session_id", "is", null)
      .order("position"),
  ]);
  if (sessions.error) throw new Error(`Could not load live sessions: ${sessions.error.message}`);

  const withStatus = sessions.data.map((session) => ({
    session,
    status: sessionStatus(session.starts_at, session.ends_at, now),
  }));
  const open = withStatus.filter((s) => s.status !== "completed");
  const past = withStatus.filter((s) => s.status === "completed").reverse();
  const resourcesFor = (id: string) => (resources.data ?? []).filter((r) => r.live_session_id === id);

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Live sessions"
        title="Seminars and office hours"
        description={`Times are shown in your time zone, ${zoneLabel(now.toISOString(), zone)}. You can change it in your settings.`}
      />

      <section aria-labelledby="upcoming" className="space-y-4">
        <SectionHeading id="upcoming" title="Upcoming" />
        {open.length === 0 ? (
          <EmptyState title="Nothing scheduled">New sessions are announced on your dashboard.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {open.map(({ session, status }) => (
              <SessionCard key={session.id} session={session} status={status} zone={zone} resources={[]} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="past" className="space-y-4">
        <SectionHeading id="past" title="Past sessions" />
        {past.length === 0 ? (
          <p className="text-ink-soft">Recordings, slides and notes will be collected here after each session.</p>
        ) : (
          <ul className="space-y-4">
            {past.map(({ session, status }) => (
              <SessionCard key={session.id} session={session} status={status} zone={zone} resources={resourcesFor(session.id)} now={now} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

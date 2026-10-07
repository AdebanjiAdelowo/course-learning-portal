export type SessionStatus = "upcoming" | "live" | "completed";

/** A session's status is derived from its times, so it is always current. */
export function sessionStatus(startsAt: string, endsAt: string, now: Date = new Date()): SessionStatus {
  const time = now.getTime();
  if (time < new Date(startsAt).getTime()) return "upcoming";
  if (time < new Date(endsAt).getTime()) return "live";
  return "completed";
}

/** The session to feature on the dashboard: one that is live now, else the soonest upcoming. */
export function nearestSession<T extends { starts_at: string; ends_at: string }>(
  sessions: readonly T[],
  now: Date = new Date(),
): T | null {
  const open = sessions
    .filter((s) => sessionStatus(s.starts_at, s.ends_at, now) !== "completed")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return open[0] ?? null;
}

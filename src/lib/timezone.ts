/** Offset of `zone` from UTC, in milliseconds, at the given instant. */
function offsetAt(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Interprets a wall-clock time ("2026-11-03T17:00", as produced by <input type="datetime-local">)
 * in an IANA time zone and returns the corresponding instant.
 */
export function zonedDateTimeToUtc(local: string, zone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error(`Expected YYYY-MM-DDTHH:MM, received "${local}".`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);

  // The offset depends on the instant, which is what we are solving for: refine once so that
  // times near a daylight-saving change resolve correctly.
  const firstGuess = wallClock - offsetAt(wallClock, zone);
  return new Date(wallClock - offsetAt(firstGuess, zone));
}

/** The calendar date ("YYYY-MM-DD") of an instant, as seen in `zone`. */
export function dateInZone(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

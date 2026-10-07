/** Formatting helpers. All dates are rendered in an explicit IANA time zone. */

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function zoneOrUtc(zone: string | null | undefined): string {
  return zone && isValidTimeZone(zone) ? zone : "UTC";
}

export function formatDate(iso: string, zone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: zoneOrUtc(zone),
  }).format(new Date(iso));
}

export function formatLongDate(iso: string, zone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: zoneOrUtc(zone),
  }).format(new Date(iso));
}

export function formatTime(iso: string, zone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zoneOrUtc(zone),
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, zone?: string | null): string {
  return `${formatDate(iso, zone)}, ${formatTime(iso, zone)}`;
}

/** "Europe/Rome" -> "Europe/Rome (CEST)" */
export function zoneLabel(iso: string, zone?: string | null): string {
  const timeZone = zoneOrUtc(zone);
  const short = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date(iso))
    .find((part) => part.type === "timeZoneName")?.value;
  return short && short !== timeZone ? `${timeZone.replace(/_/g, " ")} (${short})` : timeZone;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

const DAY_MS = 86_400_000;

/** "in 3 days", "tomorrow", "2 days ago" */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const days = Math.round(diff / DAY_MS);
  if (Math.abs(diff) < DAY_MS / 2) {
    const hours = Math.round(diff / 3_600_000);
    if (hours === 0) return "now";
    return hours > 0 ? `in ${hours} h` : `${-hours} h ago`;
  }
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export type DueState = "none" | "overdue" | "soon" | "later";

export function dueState(dueAt: string | null, now: Date = new Date()): DueState {
  if (!dueAt) return "none";
  const diff = new Date(dueAt).getTime() - now.getTime();
  if (diff < 0) return "overdue";
  return diff <= 7 * DAY_MS ? "soon" : "later";
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

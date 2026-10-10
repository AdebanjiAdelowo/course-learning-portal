/**
 * Public profile fields (shown for the instructor on the public website). Pure functions.
 * Links are restricted to plain https URLs at every layer: here, in the form validation and
 * in a database constraint.
 */

export interface ProfileLink {
  label: string;
  url: string;
}

export const PROFILE_LINK_LIMITS = { maxLinks: 8, maxLabel: 40, maxUrl: 300 } as const;

/** An https URL without embedded credentials, or null. */
export function safeHttpsUrl(value: string, maxLength: number = PROFILE_LINK_LIMITS.maxUrl): string | null {
  const text = value.trim();
  if (text === "" || text.length > maxLength || /[\s<>"]/.test(text)) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return null;
    return text;
  } catch {
    return null;
  }
}

/** Keeps only well-formed https links, whatever a stored value contains. */
export function safeProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item): ProfileLink[] => {
      if (!item || typeof item !== "object") return [];
      const { label, url } = item as Record<string, unknown>;
      if (typeof label !== "string" || typeof url !== "string") return [];
      const cleanLabel = label.trim();
      const cleanUrl = safeHttpsUrl(url);
      if (cleanLabel === "" || cleanLabel.length > PROFILE_LINK_LIMITS.maxLabel || !cleanUrl) return [];
      return [{ label: cleanLabel, url: cleanUrl }];
    })
    .slice(0, PROFILE_LINK_LIMITS.maxLinks);
}

/** An avatar is an https URL or a file shipped with the site ("/photo.jpg"); anything else is ignored. */
export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  if (/^\/(?!\/)[\w\-./%]+$/.test(value)) return value.includes("..") ? null : value;
  return safeHttpsUrl(value, 500);
}

export type ParsedLinks = { ok: true; value: ProfileLink[] } | { ok: false; error: string };

/**
 * Parses the settings form's links field: one link per line, written "Label | https://address".
 */
export function parseLinksText(text: string): ParsedLinks {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > PROFILE_LINK_LIMITS.maxLinks) {
    return { ok: false, error: `Add at most ${PROFILE_LINK_LIMITS.maxLinks} links.` };
  }
  const links: ProfileLink[] = [];
  for (const [index, line] of lines.entries()) {
    const separator = line.indexOf("|");
    if (separator === -1) return { ok: false, error: `Line ${index + 1}: write the label, then |, then the link.` };
    const label = line.slice(0, separator).trim();
    const url = safeHttpsUrl(line.slice(separator + 1));
    if (label === "" || label.length > PROFILE_LINK_LIMITS.maxLabel) {
      return { ok: false, error: `Line ${index + 1}: the label must have between 1 and ${PROFILE_LINK_LIMITS.maxLabel} characters.` };
    }
    if (!url) return { ok: false, error: `Line ${index + 1}: the link must be a full https:// address.` };
    links.push({ label, url });
  }
  return { ok: true, value: links };
}

export function linksToText(links: readonly ProfileLink[]): string {
  return links.map((link) => `${link.label} | ${link.url}`).join("\n");
}

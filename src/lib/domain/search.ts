/** Routing for course search results. Pure functions. */

export const searchKindOrder = ["lesson", "module", "problem", "project", "resource"] as const;
export type SearchKind = (typeof searchKindOrder)[number];

export function isSearchKind(value: string): value is SearchKind {
  return (searchKindOrder as readonly string[]).includes(value);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Where a search result leads, or null when the row cannot be linked safely: a content row
 * without a well-formed slug, or a resource whose address is neither https nor a local path.
 */
export function searchResultHref(kind: SearchKind, slug: string | null, url: string | null): string | null {
  if (kind === "resource") {
    if (!url) return "/learn/resources";
    if (/^https:\/\//.test(url) || /^\/(?!\/)/.test(url)) return url;
    return null;
  }
  if (!slug || !SLUG.test(slug)) return null;
  switch (kind) {
    case "lesson":
      return `/learn/lessons/${slug}`;
    case "module":
      return `/learn/modules/${slug}`;
    case "problem":
      return `/learn/practice/${slug}`;
    case "project":
      return `/learn/projects/${slug}`;
  }
}

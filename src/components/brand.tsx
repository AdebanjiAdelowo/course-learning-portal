import Link from "next/link";

import { siteConfig } from "@/config/site";

/** Wordmark: three contour lines (an isocline plot) next to the name. */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-md">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="text-accent">
        <path d="M2 19c5-9 10-9 13-4s6 4 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 13c5-8 9-8 12-4s6 4 10-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
        <path d="M2 24c5-8 11-8 14-4s5 3 8-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".3" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}

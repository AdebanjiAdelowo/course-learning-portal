import Link from "next/link";

import { siteConfig } from "@/config/site";

/** Wordmark: a small binary tree next to the name. */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-md">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="text-accent">
        <path d="M13 6 6.5 19M13 6l6.5 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity=".55" />
        <circle cx="13" cy="6" r="3.25" fill="currentColor" />
        <circle cx="6.5" cy="19.5" r="3.25" fill="currentColor" opacity=".8" />
        <circle cx="19.5" cy="19.5" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}

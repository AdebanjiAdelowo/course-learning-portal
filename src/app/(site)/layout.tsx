import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

const links = [
  { href: "/#overview", label: "Overview" },
  { href: "/#curriculum", label: "Curriculum" },
  { href: "/#instructor", label: "Instructor" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5">
          <Brand />
          <nav aria-label="Main" className="ml-6 hidden md:block">
            <ul className="flex gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="rounded-md px-3 py-2 text-[0.95rem] font-medium text-ink-soft transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex-1" />
          <ThemeToggle />
          <ButtonLink href="/learn/login" size="sm">
            Student login
          </ButtonLink>
        </div>
        <nav aria-label="Main (mobile)" className="border-t border-line md:hidden">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-1.5">
            {links.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link href={link.href} className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand />
            <p className="mt-2 text-sm text-ink-faint">{siteConfig.tagline}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
            <li><Link href="/contact" className="hover:text-ink">Contact and help</Link></li>
            <li><Link href="/learn/login" className="hover:text-ink">Student login</Link></li>
            <li><a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-ink">{siteConfig.supportEmail}</a></li>
          </ul>
        </div>
      </footer>
    </>
  );
}

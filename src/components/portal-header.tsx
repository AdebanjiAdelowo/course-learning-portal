"use client";

import { LogOut, Menu, Search, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface PortalHeaderProps {
  nav: readonly NavItem[];
  /** Root path of this area ("/learn" or "/admin"); it is active only on an exact match. */
  rootHref: string;
  areaLabel: string;
  userName: string;
  userEmail: string;
  isStaff: boolean;
  showSearch?: boolean;
}

function useActiveHref(nav: readonly NavItem[], rootHref: string): string | null {
  const pathname = usePathname();
  // Lessons and modules live under the curriculum.
  const aliased = pathname.startsWith("/learn/lessons") || pathname.startsWith("/learn/modules")
    ? "/learn/curriculum"
    : pathname;
  const match = nav
    .filter((item) =>
      item.href === rootHref ? aliased === rootHref : aliased === item.href || aliased.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form action="/learn/search" role="search" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Search the course
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Search lessons, projects, resources"
        minLength={2}
        maxLength={100}
        required
        className="field h-10 pl-9 text-sm"
      />
    </form>
  );
}

function UserMenu({ userName, userEmail, isStaff, inAdmin }: {
  userName: string;
  userEmail: string;
  isStaff: boolean;
  inAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-soft hover:bg-sunken hover:text-ink";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
      >
        <span aria-hidden="true">{initials(userName)}</span>
        <span className="sr-only">Account menu for {userName}</span>
      </button>
      <div
        id="user-menu"
        hidden={!open}
        className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)]"
      >
        <div className="border-b border-line px-3 pb-2.5 pt-2">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="truncate text-xs text-ink-faint">{userEmail}</p>
        </div>
        <div className="pt-1.5">
          <Link href="/learn/settings" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="size-4" aria-hidden="true" />
            Profile and settings
          </Link>
          {isStaff ? (
            <Link href={inAdmin ? "/learn" : "/admin"} className={itemClass} onClick={() => setOpen(false)}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              {inAdmin ? "Student view" : "Instructor area"}
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <button type="submit" className={itemClass}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NavBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-clay px-1.5 py-px text-[0.68rem] font-bold leading-4 text-white dark:text-sunken">
      {count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

export function PortalHeader({
  nav,
  rootHref,
  areaLabel,
  userName,
  userEmail,
  isStaff,
  showSearch = true,
}: PortalHeaderProps) {
  const activeHref = useActiveHref(nav, rootHref);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // The drawer is a native <dialog>: focus trapping and Escape come for free.
  useEffect(() => dialogRef.current?.close(), [pathname]);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-5">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="-ml-2 inline-flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken hover:text-ink lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </button>
        <Brand href={rootHref} />
        <span className="eyebrow hidden border-l border-line pl-3 sm:block">{areaLabel}</span>
        <div className="flex-1" />
        {showSearch ? <SearchForm id="search-desktop" className="hidden w-72 md:block" /> : null}
        <ThemeToggle />
        <UserMenu userName={userName} userEmail={userEmail} isStaff={isStaff} inAdmin={rootHref === "/admin"} />
      </div>

      <nav aria-label={areaLabel} className="mx-auto hidden w-full max-w-6xl px-5 lg:block">
        <ul className="-mb-px flex gap-1">
          {nav.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-[0.95rem] font-medium transition-colors",
                    active
                      ? "border-accent text-ink"
                      : "border-transparent text-ink-soft hover:border-line-strong hover:text-ink",
                  )}
                >
                  {item.label}
                  {item.badge ? <NavBadge count={item.badge} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none border-r border-line bg-paper p-0 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-line px-5">
            <Brand href={rootHref} />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close navigation</span>
            </button>
          </div>
          {showSearch ? <SearchForm id="search-mobile" className="border-b border-line p-4 md:hidden [&>svg]:left-7" /> : null}
          <nav aria-label={`${areaLabel} (mobile)`} className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {nav.map((item) => {
                const active = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3.5 py-3 text-base font-medium",
                        active ? "bg-accent-soft text-accent-strong" : "text-ink-soft hover:bg-sunken hover:text-ink",
                      )}
                    >
                      {item.label}
                      {item.badge ? <NavBadge count={item.badge} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </dialog>
    </header>
  );
}

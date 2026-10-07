"use client";

import { ListTree, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const STORAGE_KEY = "lesson-sidebar";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "open");
  } catch {
    // The preference simply does not persist.
  }
  for (const listener of listeners) listener();
}

/**
 * Two-column lesson layout. On large screens the curriculum sidebar can be collapsed (the
 * choice is remembered); on small screens it becomes a drawer opened from a button.
 */
export function LessonShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => dialogRef.current?.close(), [pathname]);

  return (
    <div className={cn("lg:grid lg:gap-10", collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[19rem_minmax(0,1fr)]")}>
      <aside
        id="lesson-sidebar"
        aria-label="Course contents"
        hidden={collapsed}
        className="no-print hidden lg:block"
      >
        <div className="sticky top-32 max-h-[calc(100dvh-9.5rem)] overflow-y-auto pb-6 pr-2">{sidebar}</div>
      </aside>

      <div className="min-w-0">
        <div className="no-print mb-6 flex items-center gap-2">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="lesson-sidebar"
            onClick={() => writeCollapsed(!collapsed)}
            className="hidden items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            {collapsed ? "Show contents" : "Hide contents"}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-ink-faint hover:text-ink lg:hidden"
          >
            <ListTree className="size-4" aria-hidden="true" />
            Course contents
          </button>
        </div>
        {children}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Course contents"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-0 h-dvh max-h-none w-[min(24rem,90vw)] max-w-none border-r border-line bg-paper p-0 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
            <p className="font-serif text-lg font-semibold">Course contents</p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close course contents</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
        </div>
      </dialog>
    </div>
  );
}

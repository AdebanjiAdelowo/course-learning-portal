"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Switches between light and dark. The current theme lives on <html data-theme>, set before
 * paint by the inline script in the root layout, so this button needs no React state.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing: the choice simply lasts for this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
    >
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
      <span className="sr-only">Switch between light and dark theme</span>
    </button>
  );
}

import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shared frame for the sign-in and password-reset pages. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Brand />
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-20 pt-6">
        {children}
      </main>
    </div>
  );
}

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { getAdminCourse, NIL_UUID } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";

import type { ModuleOption } from "./authoring-forms";

/** Modules of the managed course, as options for a "Module" select. */
export async function getModuleOptions(): Promise<ModuleOption[]> {
  const course = await getAdminCourse();
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, title, position")
    .eq("course_id", course?.id ?? NIL_UUID)
    .order("position");
  return (data ?? []).map((mod) => ({ id: mod.id, label: `Module ${mod.position}: ${mod.title}` }));
}

export function CreatedNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-lg border border-accent/25 bg-accent-soft px-3.5 py-3 text-sm font-medium text-accent-strong">
      {children}
    </p>
  );
}

/** Page frame shared by the quiz and project editors. */
export function EditorShell({
  eyebrow,
  heading,
  previewHref,
  children,
}: {
  eyebrow: string;
  heading: string;
  previewHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="border-b border-line pb-8">
        <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Course content
        </Link>
        <p className="eyebrow mt-5">{eyebrow}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">{heading}</h1>
          {previewHref ? (
            <Link href={previewHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline">
              View as a student
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}

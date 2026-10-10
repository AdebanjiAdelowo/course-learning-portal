import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { getAdminCourse, getModuleLabels, NIL_UUID } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";

import { LessonForm, type LessonFormValues } from "../../forms";

/** Shared page body for creating and editing a lesson. */
export async function LessonEditor({
  heading,
  values,
  previewSlug,
  notice,
}: {
  heading: string;
  values: LessonFormValues;
  previewSlug?: string;
  notice?: ReactNode;
}) {
  const course = await getAdminCourse();
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, position")
    .eq("course_id", course?.id ?? NIL_UUID)
    .order("position");

  const labels = await getModuleLabels();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="border-b border-line pb-8">
        <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Course content
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">{heading}</h1>
          {previewSlug ? (
            <Link href={`/learn/lessons/${previewSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline">
              View as a student
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </header>
      <LessonForm
        values={values}
        modules={(modules ?? []).map((mod) => ({ id: mod.id, label: labels.describe(mod) }))}
        notice={notice}
      />
    </div>
  );
}

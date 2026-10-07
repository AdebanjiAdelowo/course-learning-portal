import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

import { LessonEditor } from "../lesson-editor";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireStaff();

  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) notFound();

  return (
    <LessonEditor
      heading={lesson.title}
      previewSlug={lesson.slug}
      notice={
        created ? (
          <p role="status" className="rounded-lg border border-accent/25 bg-accent-soft px-3.5 py-3 text-sm font-medium text-accent-strong">
            Lesson created. It was added at the end of its module.
          </p>
        ) : undefined
      }
      values={{
        id: lesson.id,
        module_id: lesson.module_id,
        title: lesson.title,
        slug: lesson.slug,
        summary: lesson.summary,
        objectives: lesson.objectives.join("\n"),
        duration_minutes: lesson.duration_minutes,
        video_url: lesson.video_url ?? "",
        body_md: lesson.body_md,
        is_published: lesson.is_published,
      }}
    />
  );
}

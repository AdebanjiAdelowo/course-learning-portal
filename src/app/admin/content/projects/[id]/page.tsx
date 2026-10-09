import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/data/viewer";
import { rubricToText, type RubricRow } from "@/lib/domain/authoring";
import { zoneLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { toZonedInputValue } from "@/lib/timezone";

import { ProjectForm } from "../../authoring-forms";
import { CreatedNotice, EditorShell, getModuleOptions } from "../../editor-shell";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await requireStaff();
  const zone = viewer.profile.timezone;

  const supabase = await createClient();
  const [{ data: project }, { count: submissions }, modules] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("project_id", id),
    getModuleOptions(),
  ]);
  if (!project) notFound();

  return (
    <EditorShell eyebrow="Project" heading={project.title} previewHref={project.is_published ? `/learn/projects/${project.slug}` : undefined}>
      {submissions ? (
        <p className="rounded-lg border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn">
          {submissions} {submissions === 1 ? "student has" : "students have"} started or submitted this project. Changing the rubric does not
          change scores that have already been given.
        </p>
      ) : null}
      <ProjectForm
        modules={modules}
        zoneLabel={zoneLabel(project.due_at ?? new Date().toISOString(), zone)}
        notice={created ? <CreatedNotice>Project created. Publish it when the brief is ready.</CreatedNotice> : undefined}
        values={{
          id: project.id,
          module_id: project.module_id,
          title: project.title,
          slug: project.slug,
          summary: project.summary,
          description_md: project.description_md,
          objectives: project.objectives.join("\n"),
          requirements: project.requirements.join("\n"),
          submission_instructions_md: project.submission_instructions_md,
          rubric_text: rubricToText((project.rubric as unknown as RubricRow[]) ?? []),
          due_at: project.due_at ? toZonedInputValue(new Date(project.due_at), zone) : "",
          is_published: project.is_published,
        }}
      />
    </EditorShell>
  );
}

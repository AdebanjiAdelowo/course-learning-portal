import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getAdminCourse, getModuleLabels } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { hasPlan, parseModulePlan } from "@/lib/domain/path";
import { createClient } from "@/lib/supabase/server";

import { ModuleEditForm } from "../../../forms";
import { EditorShell } from "../../editor-shell";

export const metadata: Metadata = { title: "Edit module" };

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireStaff();
  const course = await getAdminCourse();
  if (!course) notFound();

  const supabase = await createClient();
  const [{ data: mod }, { data: phases }, { count: lessonCount }] = await Promise.all([
    supabase
      .from("modules")
      .select("id, slug, title, description, position, phase_id, requires_previous, is_published, plan")
      .eq("id", id)
      .eq("course_id", course.id)
      .maybeSingle(),
    supabase.from("phases").select("id, title, position").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", id).eq("is_published", true),
  ]);
  if (!mod) notFound();
  const plan = parseModulePlan(mod.plan);
  const labels = await getModuleLabels();

  return (
    <EditorShell
      eyebrow={`${labels.byId.get(mod.id)?.text ?? `Module ${mod.position}`} · ${mod.is_published ? "published" : "planned"}`}
      heading={mod.title}
      previewHref={mod.is_published ? `/learn/modules/${mod.slug}` : "/learn/curriculum"}
    >
      <p className="text-ink-soft">
        {lessonCount ?? 0} published {lessonCount === 1 ? "lesson" : "lessons"}. To move this module earlier or later in the course, use the
        arrows on the content page.
      </p>
      <section aria-label="Module details" className="card p-6 sm:p-7">
        <ModuleEditForm
          values={{
            id: mod.id,
            title: mod.title,
            slug: mod.slug,
            description: mod.description,
            phase_id: mod.phase_id,
            requires_previous: mod.requires_previous,
            is_published: mod.is_published,
          }}
          phases={(phases ?? []).map((phase, index) => ({ id: phase.id, label: `Phase ${index + 1}: ${phase.title}` }))}
        />
      </section>
      {hasPlan(plan) ? (
        <section aria-labelledby="module-plan" className="card p-6 sm:p-7">
          <h2 id="module-plan" className="text-xl font-semibold">Plan shown to students</h2>
          <p className="mt-1 text-sm text-ink-faint">
            Written in <code className="font-mono">seed/plans.ts</code> and loaded by the seed script. Shown while the module is planned.
          </p>
          {plan.objectives.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-ink-soft">
              {plan.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          ) : null}
          {plan.lessons.length > 0 ? (
            <ol className="mt-4 list-decimal space-y-1 pl-5">
              {plan.lessons.map((lesson) => (
                <li key={lesson.title}>
                  <span className="font-semibold">{lesson.title}</span>
                  {lesson.summary ? <span className="text-ink-soft">: {lesson.summary}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
    </EditorShell>
  );
}

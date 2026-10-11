import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { resourceKinds } from "@/components/resource-list";
import { SubmitButton } from "@/components/ui/form";
import { SectionHeading } from "@/components/ui/page-header";
import { getAdminCourse, NIL_UUID, getModuleLabels } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { deleteResource } from "../actions";
import { ResourceForm, type ResourceTargetGroup } from "../authoring-forms";

export const metadata: Metadata = { title: "Resources" };

export default async function AdminResourcesPage() {
  const viewer = await requireStaff();
  const course = await getAdminCourse();
  const courseId = course?.id ?? NIL_UUID;

  const supabase = await createClient();
  const [resources, modules, lessons, projects, sessions] = await Promise.all([
    supabase.from("resources").select("id, title, description, kind, url, module_id, lesson_id, project_id, live_session_id").eq("course_id", courseId).order("position"),
    supabase.from("modules").select("id, title, position").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("id, title, module_id, position").eq("course_id", courseId).order("position"),
    supabase.from("projects").select("id, title, module_id").eq("course_id", courseId).order("title"),
    supabase.from("live_sessions").select("id, title, starts_at").eq("course_id", courseId).order("starts_at"),
  ]);
  if (resources.error) throw new Error(`Could not load resources: ${resources.error.message}`);

  const moduleRows = modules.data ?? [];
  const moduleNumber = (id: string) => moduleRows.find((mod) => mod.id === id)?.position ?? 0;
  const labels = await getModuleLabels();
  // "1.4" is lesson 4 of DSA Module 1; "P2.3" is lesson 3 of Python Module P2.
  const moduleCode = (id: string) => labels.byId.get(id)?.code ?? String(moduleNumber(id));
  const lessonRows = [...(lessons.data ?? [])].sort((a, b) => moduleNumber(a.module_id) - moduleNumber(b.module_id) || a.position - b.position);

  const targets: ResourceTargetGroup[] = [
    { label: "Modules", options: moduleRows.map((mod) => ({ value: `module:${mod.id}`, label: labels.describe(mod) })) },
    { label: "Lessons", options: lessonRows.map((lesson) => ({ value: `lesson:${lesson.id}`, label: `${moduleCode(lesson.module_id)}.${lesson.position} ${lesson.title}` })) },
    { label: "Projects", options: (projects.data ?? []).map((project) => ({ value: `project:${project.id}`, label: project.title })) },
    {
      label: "Live sessions",
      options: (sessions.data ?? []).map((session) => ({
        value: `session:${session.id}`,
        label: `${formatDate(session.starts_at, viewer.profile.timezone)}: ${session.title}`,
      })),
    },
  ].filter((group) => group.options.length > 0);

  const belongsTo = (resource: (typeof resources.data)[number]): string => {
    if (resource.lesson_id) return `Lesson: ${lessonRows.find((l) => l.id === resource.lesson_id)?.title ?? "removed"}`;
    if (resource.project_id) return `Project: ${(projects.data ?? []).find((p) => p.id === resource.project_id)?.title ?? "removed"}`;
    if (resource.live_session_id) return `Session: ${(sessions.data ?? []).find((s) => s.id === resource.live_session_id)?.title ?? "removed"}`;
    if (resource.module_id) return labels.byId.get(resource.module_id)?.text ?? `Module ${moduleNumber(resource.module_id)}`;
    return "Whole course";
  };

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-8">
        <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Course content
        </Link>
        <p className="eyebrow mt-5">Instructor area</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Resources</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Links and files shown beside a lesson, project, module or live session, and collected in the students&apos; course library.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="all-resources" className="space-y-4">
          <SectionHeading id="all-resources" title={`All resources (${resources.data.length})`} />
          {resources.data.length === 0 ? (
            <p className="text-ink-soft">No resources yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {resources.data.map((resource) => (
                <li key={resource.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold hover:text-accent"
                    >
                      <span className="truncate">{resource.title}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <p className="truncate text-sm text-ink-faint">{resource.url}</p>
                    <p className="eyebrow mt-1">
                      {resourceKinds[resource.kind].label} · {belongsTo(resource)}
                    </p>
                  </div>
                  <form action={deleteResource}>
                    <input type="hidden" name="id" value={resource.id} />
                    <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…" aria-label={`Delete ${resource.title}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="add-resource" className="card h-fit p-6">
          <h2 id="add-resource" className="text-xl font-semibold">
            Add a resource
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Files in the site&apos;s public folder can be opened by anyone who has the address. Keep confidential material elsewhere and link to it.
          </p>
          <div className="mt-5">
            <ResourceForm targets={targets} />
          </div>
        </section>
      </div>
    </div>
  );
}

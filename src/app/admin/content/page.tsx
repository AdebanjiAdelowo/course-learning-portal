import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { getAdminCourse } from "@/lib/data/admin";
import { formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { ModuleForm } from "../forms";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const course = await getAdminCourse();
  if (!course) return <EmptyState title="No course yet">Load one with the seed script first.</EmptyState>;

  const supabase = await createClient();
  const [modules, lessons, quizzes, projects] = await Promise.all([
    supabase.from("modules").select("id, title, position, is_published, requires_previous, available_from").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, slug, position, duration_minutes, is_published").eq("course_id", course.id).order("position"),
    supabase.from("quizzes").select("id, module_id, title, pass_percent, questions(count)").eq("course_id", course.id),
    supabase.from("projects").select("id, module_id, title, max_points").eq("course_id", course.id),
  ]);
  if (modules.error) throw new Error(`Could not load content: ${modules.error.message}`);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Instructor area"
        title="Course content"
        description="Edit lessons here. Quizzes and projects are defined in the seed files and loaded with npm run seed:content."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="modules" className="space-y-5">
          <SectionHeading id="modules" title={course.title} />
          {modules.data.length === 0 ? (
            <EmptyState title="No modules yet">Add the first module with the form on this page.</EmptyState>
          ) : (
            <ol className="space-y-5">
              {modules.data.map((mod) => {
                const moduleLessons = (lessons.data ?? []).filter((l) => l.module_id === mod.id);
                const moduleQuizzes = (quizzes.data ?? []).filter((q) => q.module_id === mod.id);
                const moduleProjects = (projects.data ?? []).filter((p) => p.module_id === mod.id);
                return (
                  <li key={mod.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">Module {mod.position}</p>
                        <h3 className="mt-1 text-lg font-semibold">{mod.title}</h3>
                      </div>
                      <ButtonLink href={`/admin/content/lessons/new?module=${mod.id}`} variant="secondary" size="sm">
                        <Plus className="size-4" aria-hidden="true" />
                        Add lesson
                      </ButtonLink>
                    </div>
                    {moduleLessons.length > 0 ? (
                      <ol className="mt-4 divide-y divide-line border-t border-line">
                        {moduleLessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-center justify-between gap-3 py-2.5">
                            <Link href={`/admin/content/lessons/${lesson.id}`} className="min-w-0 truncate font-medium hover:text-accent">
                              {lesson.position}. {lesson.title}
                            </Link>
                            <span className="flex shrink-0 items-center gap-2 text-sm text-ink-faint">
                              {formatDuration(lesson.duration_minutes)}
                              {lesson.is_published ? null : <Badge tone="warn">Draft</Badge>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-4 text-sm text-ink-soft">No lessons yet.</p>
                    )}
                    <p className="mt-3 border-t border-line pt-3 text-sm text-ink-faint">
                      {moduleQuizzes.length > 0
                        ? moduleQuizzes.map((q) => `Quiz: ${q.title} (${q.questions[0]?.count ?? 0} questions, pass ${q.pass_percent}%)`).join(" · ")
                        : "No quiz"}
                      {" · "}
                      {moduleProjects.length > 0 ? moduleProjects.map((p) => `Project: ${p.title} (${p.max_points} points)`).join(" · ") : "No project"}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="add-module" className="card h-fit p-6">
          <h2 id="add-module" className="text-xl font-semibold">Add a module</h2>
          <div className="mt-5">
            <ModuleForm />
          </div>
        </section>
      </div>
    </div>
  );
}

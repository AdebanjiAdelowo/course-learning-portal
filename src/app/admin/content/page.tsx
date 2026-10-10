import { ArrowDown, ArrowUp, ClipboardCheck, Code2, FlaskConical, Paperclip, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/form";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { getAdminCourse } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { formatDate, formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { moveModule } from "../actions";
import { ModuleForm } from "../forms";
import { moveLesson } from "./actions";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const viewer = await requireStaff();
  const course = await getAdminCourse();
  if (!course) return <EmptyState title="No course yet">Load one with the seed script first.</EmptyState>;

  const supabase = await createClient();
  const [modules, lessons, quizzes, projects, resources, phases, problems] = await Promise.all([
    supabase.from("modules").select("id, title, position, phase_id, is_published, requires_previous, available_from").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, slug, position, duration_minutes, is_published").eq("course_id", course.id).order("position"),
    supabase.from("quizzes").select("id, module_id, title, pass_percent, is_published, questions(count)").eq("course_id", course.id).order("title"),
    supabase.from("projects").select("id, module_id, title, max_points, due_at, is_published").eq("course_id", course.id).order("due_at", { nullsFirst: false }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("course_id", course.id),
    supabase.from("phases").select("id, title, position").eq("course_id", course.id).order("position"),
    supabase.from("coding_problems").select("id, module_id").eq("course_id", course.id),
  ]);
  if (modules.error) throw new Error(`Could not load content: ${modules.error.message}`);
  const phaseLabel = new Map((phases.data ?? []).map((phase, index) => [phase.id, `Phase ${index + 1}: ${phase.title}`]));
  const publishedCount = modules.data.filter((mod) => mod.is_published).length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Instructor area"
        title="Course content"
        description={`${publishedCount} of ${modules.data.length} modules published. Planned modules are shown to students by title only. Drafts stay hidden until you publish them.`}
        actions={
          <ButtonLink href="/admin/content/resources" variant="secondary">
            <Paperclip className="size-4" aria-hidden="true" />
            Resources ({resources.count ?? 0})
          </ButtonLink>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="modules" className="space-y-5">
          <SectionHeading id="modules" title={course.title} />
          {modules.data.length === 0 ? (
            <EmptyState title="No modules yet">Add the first module with the form on this page.</EmptyState>
          ) : (
            <ol className="space-y-5">
              {modules.data.map((mod, moduleIndex) => {
                const problemCount = (problems.data ?? []).filter((p) => p.module_id === mod.id).length;
                const moduleLessons = (lessons.data ?? []).filter((l) => l.module_id === mod.id);
                const moduleQuizzes = (quizzes.data ?? []).filter((q) => q.module_id === mod.id);
                const moduleProjects = (projects.data ?? []).filter((p) => p.module_id === mod.id);
                return (
                  <li key={mod.id} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="eyebrow mr-auto">
                        {mod.phase_id && phaseLabel.has(mod.phase_id) ? `${phaseLabel.get(mod.phase_id)} · ` : ""}Module {mod.position}
                      </p>
                      {mod.is_published ? <Badge tone="accent">Published</Badge> : <Badge>Planned</Badge>}
                      {(["up", "down"] as const).map((direction) => (
                        <form key={direction} action={moveModule}>
                          <input type="hidden" name="id" value={mod.id} />
                          <input type="hidden" name="direction" value={direction} />
                          <SubmitButton
                            variant="ghost"
                            size="sm"
                            className="w-9 px-0"
                            disabled={direction === "up" ? moduleIndex === 0 : moduleIndex === modules.data.length - 1}
                            aria-label={`Move module ${mod.title} ${direction}`}
                          >
                            {direction === "up" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
                          </SubmitButton>
                        </form>
                      ))}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{mod.title}</h3>
                    {problemCount > 0 ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint">
                        <Code2 className="size-4" aria-hidden="true" />
                        {problemCount} coding {problemCount === 1 ? "problem" : "problems"} (authored in the seed files)
                      </p>
                    ) : null}

                    <h4 className="mt-5 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Lessons</h4>
                    {moduleLessons.length > 0 ? (
                      <ol className="mt-2 divide-y divide-line border-y border-line">
                        {moduleLessons.map((lesson, index) => (
                          <li key={lesson.id} className="flex items-center gap-2 py-2">
                            <Link href={`/admin/content/lessons/${lesson.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
                              {index + 1}. {lesson.title}
                            </Link>
                            {lesson.is_published ? null : <Badge tone="warn">Draft</Badge>}
                            <span className="hidden shrink-0 text-sm text-ink-faint sm:inline">{formatDuration(lesson.duration_minutes)}</span>
                            {(["up", "down"] as const).map((direction) => (
                              <form key={direction} action={moveLesson}>
                                <input type="hidden" name="id" value={lesson.id} />
                                <input type="hidden" name="direction" value={direction} />
                                <SubmitButton
                                  variant="ghost"
                                  size="sm"
                                  className="w-9 px-0"
                                  disabled={direction === "up" ? index === 0 : index === moduleLessons.length - 1}
                                  aria-label={`Move ${lesson.title} ${direction}`}
                                >
                                  {direction === "up" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
                                </SubmitButton>
                              </form>
                            ))}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-sm text-ink-soft">No lessons yet.</p>
                    )}

                    <h4 className="mt-5 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Quiz and project</h4>
                    {moduleQuizzes.length + moduleProjects.length > 0 ? (
                      <ul className="mt-2 divide-y divide-line border-y border-line">
                        {moduleQuizzes.map((quiz) => (
                          <li key={quiz.id} className="flex items-center gap-3 py-2">
                            <ClipboardCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
                            <Link href={`/admin/content/quizzes/${quiz.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
                              {quiz.title}
                            </Link>
                            {quiz.is_published ? null : <Badge tone="warn">Draft</Badge>}
                            <span className="shrink-0 text-sm text-ink-faint">
                              {quiz.questions[0]?.count ?? 0} questions · pass {quiz.pass_percent}%
                            </span>
                          </li>
                        ))}
                        {moduleProjects.map((project) => (
                          <li key={project.id} className="flex items-center gap-3 py-2">
                            <FlaskConical className="size-4 shrink-0 text-accent" aria-hidden="true" />
                            <Link href={`/admin/content/projects/${project.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
                              {project.title}
                            </Link>
                            {project.is_published ? null : <Badge tone="warn">Draft</Badge>}
                            <span className="shrink-0 text-sm text-ink-faint">
                              {project.max_points} points
                              {project.due_at ? ` · due ${formatDate(project.due_at, viewer.profile.timezone)}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-ink-soft">None yet.</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <ButtonLink href={`/admin/content/modules/${mod.id}`} variant="secondary" size="sm">
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit module
                      </ButtonLink>
                      <ButtonLink href={`/admin/content/lessons/new?module=${mod.id}`} variant="secondary" size="sm">
                        <Plus className="size-4" aria-hidden="true" />
                        Lesson
                      </ButtonLink>
                      <ButtonLink href={`/admin/content/quizzes/new?module=${mod.id}`} variant="secondary" size="sm">
                        <Plus className="size-4" aria-hidden="true" />
                        Quiz
                      </ButtonLink>
                      <ButtonLink href={`/admin/content/projects/new?module=${mod.id}`} variant="secondary" size="sm">
                        <Plus className="size-4" aria-hidden="true" />
                        Project
                      </ButtonLink>
                    </div>
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

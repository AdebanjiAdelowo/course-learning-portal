import type { Metadata } from "next";
import Link from "next/link";

import { ResourceList, resourceKinds } from "@/components/resource-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { requireCourseState } from "@/lib/data/course";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resources" };

type Kind = Database["public"]["Enums"]["resource_kind"];

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const { course, modules, lessons, projects } = await requireCourseState();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, kind, url, module_id, lesson_id, project_id, live_session_id")
    .eq("course_id", course.id)
    .order("position");
  if (error) throw new Error(`Could not load resources: ${error.message}`);

  const available = [...new Set(data.map((r) => r.kind))].sort();
  const active = available.find((k) => k === kind) as Kind | undefined;
  const visible = active ? data.filter((r) => r.kind === active) : data;

  // Group by the module a resource belongs to, directly or through its lesson or project.
  const moduleOf = (resource: (typeof data)[number]): string | null =>
    resource.module_id ??
    lessons.find((l) => l.id === resource.lesson_id)?.module_id ??
    projects.find((p) => p.id === resource.project_id)?.module_id ??
    null;

  const groups = [
    ...modules.map((mod) => ({
      id: mod.id,
      title: `Module ${mod.position}: ${mod.title}`,
      items: visible.filter((r) => moduleOf(r) === mod.id),
    })),
    { id: "general", title: "General and live sessions", items: visible.filter((r) => moduleOf(r) === null) },
  ].filter((group) => group.items.length > 0);

  const chip = (selected: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
      selected ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink",
    );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Resources"
        title="Course library"
        description="Notebooks, datasets, reference sheets, code and further reading, gathered from every module."
      />

      {data.length === 0 ? (
        <EmptyState title="No resources yet">Files and links shared by your instructor will be collected here.</EmptyState>
      ) : (
        <>
          <nav aria-label="Filter by type">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href="/learn/resources" aria-current={active ? undefined : "true"} className={chip(!active)}>
                  All ({data.length})
                </Link>
              </li>
              {available.map((k) => (
                <li key={k}>
                  <Link href={`/learn/resources?kind=${k}`} aria-current={active === k ? "true" : undefined} className={chip(active === k)}>
                    {resourceKinds[k].label} ({data.filter((r) => r.kind === k).length})
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-4">
                <h2 id={`group-${group.id}`} className="text-xl font-semibold">
                  {group.title}
                </h2>
                <ResourceList resources={group.items} />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

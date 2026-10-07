import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DueBadge, ProjectStatusBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { isProjectDone } from "@/lib/domain/progress";
import { dueState, formatDate, relativeDays } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const { progress, projects, record } = await requireCourseState();
  const now = new Date();
  const rows = progress.moduleProgress.flatMap((item) =>
    projects.filter((p) => p.module_id === item.module.id).map((project) => ({ project, item })),
  );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Projects"
        title="Projects and assignments"
        description={`${progress.projects.submitted} of ${progress.projects.total} handed in. Each project is reviewed by your instructor against a published rubric.`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No projects yet">Projects appear here when your instructor publishes them.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ project, item }) => {
            const status = record.projectStatuses.get(project.id) ?? "not_started";
            const locked = item.state === "locked";
            return (
              <li key={project.id} className="card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      Module {item.module.position} · {item.module.title}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {locked ? (
                        project.title
                      ) : (
                        <Link href={`/learn/projects/${project.slug}`} className="hover:text-accent">
                          {project.title}
                        </Link>
                      )}
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-ink-soft">{project.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    {locked ? (
                      <Badge>
                        <Lock className="size-3" aria-hidden="true" />
                        Locked
                      </Badge>
                    ) : (
                      <ProjectStatusBadge status={status} />
                    )}
                    {project.due_at && !isProjectDone(status) && !locked ? (
                      <DueBadge state={dueState(project.due_at, now)} text={relativeDays(project.due_at, now)} />
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-sm text-ink-faint">
                  {project.due_at ? `Deadline ${formatDate(project.due_at, viewer.profile.timezone)}` : "No deadline"} ·{" "}
                  {project.max_points} points
                  {locked ? ` · ${item.lockReason}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

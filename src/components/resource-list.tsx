import { BookOpen, Code2, Database, Download, ExternalLink, FileText, Link2, NotebookPen, Presentation, Video } from "lucide-react";
import type { ComponentType } from "react";

import type { Database as Db } from "@/lib/supabase/database.types";

type ResourceKind = Db["public"]["Enums"]["resource_kind"];

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  url: string;
}

export const resourceKinds: Record<ResourceKind, { label: string; icon: ComponentType<{ className?: string }> }> = {
  pdf: { label: "PDF", icon: FileText },
  notebook: { label: "Notebook", icon: NotebookPen },
  dataset: { label: "Dataset", icon: Database },
  code: { label: "Code", icon: Code2 },
  video: { label: "Video", icon: Video },
  slides: { label: "Slides", icon: Presentation },
  reading: { label: "Reading", icon: BookOpen },
  link: { label: "Link", icon: Link2 },
};

/** Files shipped with the site (paths starting with "/") download; everything else opens in a new tab. */
export function ResourceList({ resources }: { resources: ResourceItem[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {resources.map((resource) => {
        const { label, icon: Icon } = resourceKinds[resource.kind];
        const local = resource.url.startsWith("/");
        return (
          <li key={resource.id}>
            <a
              href={resource.url}
              {...(local ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
              className="group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-sunken"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold group-hover:text-accent">{resource.title}</span>
                {resource.description ? (
                  <span className="block text-sm text-ink-soft">{resource.description}</span>
                ) : null}
                <span className="eyebrow mt-1 block">{label}</span>
              </span>
              {local ? (
                <Download className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              ) : (
                <ExternalLink className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              )}
              <span className="sr-only">{local ? "(download)" : "(opens in a new tab)"}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

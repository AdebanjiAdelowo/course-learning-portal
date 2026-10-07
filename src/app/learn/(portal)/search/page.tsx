import { BookOpenText, ExternalLink, FlaskConical, Layers, Paperclip, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Search" };

type Kind = "lesson" | "module" | "project" | "resource";

const kinds: Record<Kind, { label: string; plural: string; icon: ComponentType<{ className?: string }> }> = {
  lesson: { label: "Lesson", plural: "Lessons", icon: BookOpenText },
  module: { label: "Module", plural: "Modules", icon: Layers },
  project: { label: "Project", plural: "Projects", icon: FlaskConical },
  resource: { label: "Resource", plural: "Resources", icon: Paperclip },
};

function hrefFor(kind: Kind, slug: string | null, url: string | null): string {
  if (kind === "lesson") return `/learn/lessons/${slug}`;
  if (kind === "module") return `/learn/modules/${slug}`;
  if (kind === "project") return `/learn/projects/${slug}`;
  return url ?? "/learn/resources";
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const raw = (Array.isArray(q) ? q[0] : q) ?? "";
  const parsed = searchQuerySchema.safeParse(raw);
  const { course } = await requireCourseState();

  let results: { kind: Kind; id: string; slug: string | null; title: string; snippet: string; context: string; url: string | null }[] = [];
  if (parsed.success) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_course", { p_course_id: course.id, p_query: parsed.data });
    if (error) throw new Error(`Search failed: ${error.message}`);
    results = data.filter((row): row is typeof row & { kind: Kind } => row.kind in kinds);
  }

  const order: Kind[] = ["lesson", "module", "project", "resource"];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Search"
        title={parsed.success ? `Results for “${parsed.data}”` : "Search the course"}
        description={
          parsed.success
            ? `${results.length} ${results.length === 1 ? "match" : "matches"} in lessons, modules, projects and resources.`
            : "Find lessons, modules, projects and resources by keyword."
        }
      />

      <form action="/learn/search" role="search" className="flex gap-3">
        <div className="relative flex-1">
          <label htmlFor="search-page" className="sr-only">
            Search the course
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            id="search-page"
            type="search"
            name="q"
            defaultValue={raw}
            minLength={2}
            maxLength={100}
            required
            placeholder="For example: stability, automatic differentiation, Darcy"
            className="field h-12 pl-10"
          />
        </div>
        <button type="submit" className="h-12 rounded-lg bg-accent px-5 font-semibold text-on-accent transition-colors hover:bg-accent-strong">
          Search
        </button>
      </form>

      {raw && !parsed.success ? (
        <p role="alert" className="text-danger">
          Enter at least two characters to search.
        </p>
      ) : null}

      {parsed.success && results.length === 0 ? (
        <EmptyState title="No matches">
          Try a shorter or more general term, or browse the curriculum and the resource library.
        </EmptyState>
      ) : null}

      {order.map((kind) => {
        const group = results.filter((r) => r.kind === kind);
        if (group.length === 0) return null;
        const { plural, icon: Icon } = kinds[kind];
        return (
          <section key={kind} aria-labelledby={`results-${kind}`} className="space-y-3">
            <h2 id={`results-${kind}`} className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">
              <Icon className="size-4 text-accent" aria-hidden="true" />
              {plural} ({group.length})
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {group.map((result) => {
                const href = hrefFor(kind, result.slug, result.url);
                const external = /^https?:\/\//.test(href);
                const body = (
                  <>
                    <span className="flex items-center gap-2 font-semibold group-hover:text-accent">
                      {result.title}
                      {external ? <ExternalLink className="size-3.5 text-ink-faint" aria-hidden="true" /> : null}
                    </span>
                    {result.snippet ? <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{result.snippet}</span> : null}
                    <span className="eyebrow mt-1.5 block">{result.context}</span>
                  </>
                );
                return (
                  <li key={result.id}>
                    {external || (kind === "resource" && href !== "/learn/resources") ? (
                      <a
                        href={href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                        className="group block px-4 py-3.5 transition-colors hover:bg-sunken"
                      >
                        {body}
                      </a>
                    ) : (
                      <Link href={href} className="group block px-4 py-3.5 transition-colors hover:bg-sunken">
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

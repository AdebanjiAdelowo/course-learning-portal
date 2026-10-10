import { Info, Lock, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DifficultyBadge, PracticeStatusBadge } from "@/components/practice-status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import {
  difficultyLabels,
  filterProblems,
  PRACTICE_NOTICE,
  practiceStatusLabels,
  type PracticeFilter,
  type PracticeStatus,
  type ProblemDifficulty,
} from "@/lib/domain/practice";

export const metadata: Metadata = { title: "Practice" };

const difficulties = Object.keys(difficultyLabels) as ProblemDifficulty[];
// "Automatically verified" cannot occur until a grading service exists, so it is not offered.
const statuses: PracticeStatus[] = ["not_attempted", "draft", "submitted"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; difficulty?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const { problems, practice, progress } = await requireCourseState();

  const difficulty = first(params.difficulty);
  const status = first(params.status);
  const filter: PracticeFilter = {
    query: first(params.q).trim().slice(0, 100),
    difficulty: (difficulties as string[]).includes(difficulty) ? (difficulty as ProblemDifficulty) : "all",
    status: (statuses as string[]).includes(status) ? (status as PracticeStatus) : "all",
  };
  const filtered = filter.query !== "" || filter.difficulty !== "all" || filter.status !== "all";

  const modules = new Map(progress.moduleProgress.map((item) => [item.module.id, item]));
  const rows = problems.flatMap((problem) => {
    const item = modules.get(problem.module_id);
    if (!item) return [];
    const standing = practice.get(problem.id) ?? { status: "not_attempted" as const, attempts: 0 };
    return [
      {
        ...problem,
        moduleTitle: item.module.title,
        modulePosition: item.module.position,
        locked: item.state === "locked",
        status: standing.status,
        attempts: standing.attempts,
      },
    ];
  });
  const shown = filterProblems(rows, filter);
  const submitted = rows.filter((row) => row.status === "submitted" || row.status === "verified").length;
  const drafts = rows.filter((row) => row.status === "draft").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Practice"
        title="Coding practice"
        description={
          rows.length > 0
            ? `${rows.length} ${rows.length === 1 ? "problem" : "problems"} · ${submitted} submitted for self-review · ${drafts} in draft`
            : "Problems to solve in Python, from warm-up to challenge."
        }
      />

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-ink-soft">
        <Info className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <span>
          {PRACTICE_NOTICE} Each problem has hints you can reveal one at a time, and an editorial with a reference solution that
          opens once you have submitted an attempt.
        </span>
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No practice problems yet">Problems appear here when your instructor publishes them.</EmptyState>
      ) : (
        <>
          {/* Keyed by the applied filter: the fields are uncontrolled, so without a new key they
              would keep showing the old values after "Clear" or the browser's back button. */}
          <form key={`${filter.query}|${filter.difficulty}|${filter.status}`} action="/learn/practice" role="search" aria-label="Filter problems" className="card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end sm:p-5">
            <div>
              <label htmlFor="practice-q" className="block text-sm font-semibold">
                Search
              </label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <input
                  id="practice-q"
                  type="search"
                  name="q"
                  defaultValue={filter.query}
                  maxLength={100}
                  placeholder="Title, topic or module"
                  className="field h-11 pl-9"
                />
              </div>
            </div>
            <div>
              <label htmlFor="practice-difficulty" className="block text-sm font-semibold">
                Difficulty
              </label>
              <select id="practice-difficulty" name="difficulty" defaultValue={filter.difficulty} className="field mt-2 h-11">
                <option value="all">Any</option>
                {difficulties.map((value) => (
                  <option key={value} value={value}>
                    {difficultyLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="practice-status" className="block text-sm font-semibold">
                Status
              </label>
              <select id="practice-status" name="status" defaultValue={filter.status} className="field mt-2 h-11">
                <option value="all">Any</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {practiceStatusLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-strong">
                Filter
              </button>
              {filtered ? (
                <ButtonLink href="/learn/practice" variant="secondary">
                  Clear
                </ButtonLink>
              ) : null}
            </div>
          </form>

          <p className="text-sm text-ink-faint" role="status">
            {filtered ? `Showing ${shown.length} of ${rows.length} problems.` : `Showing all ${rows.length} problems, in course order.`}
          </p>

          {shown.length === 0 ? (
            <EmptyState title="No problems match" action={<ButtonLink href="/learn/practice" variant="secondary">Clear the filters</ButtonLink>}>
              Try a different search term, or remove a filter.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {shown.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      Module {row.modulePosition} · {row.moduleTitle}
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold">
                      {row.locked ? (
                        row.title
                      ) : (
                        <Link href={`/learn/practice/${row.slug}`} className="hover:text-accent">
                          {row.title}
                        </Link>
                      )}
                    </h2>
                    <p className="mt-1 max-w-2xl text-ink-soft">{row.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <DifficultyBadge difficulty={row.difficulty} />
                    {row.locked ? (
                      <Badge>
                        <Lock className="size-3" aria-hidden="true" />
                        Locked
                      </Badge>
                    ) : (
                      <PracticeStatusBadge status={row.status} />
                    )}
                    <span className="text-sm text-ink-faint">
                      {row.attempts === 0 ? "No attempts" : `${row.attempts} ${row.attempts === 1 ? "attempt" : "attempts"}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

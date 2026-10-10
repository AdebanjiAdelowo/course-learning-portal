import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModuleOutline } from "@/components/module-outline";
import { DifficultyBadge, PracticeStatusBadge } from "@/components/practice-status";
import { ResourceList } from "@/components/resource-list";
import { ModuleStateBadge } from "@/components/status";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { requireCourseState } from "@/lib/data/course";
import { formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { progress } = await requireCourseState();
  const item = progress.moduleProgress.find((m) => m.module.slug === slug);
  return { title: item ? `${item.module.label}: ${item.module.title}` : "Module" };
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const { progress, record, problems, practice, path } = await requireCourseState();
  const item = progress.moduleProgress.find((m) => m.module.slug === slug);
  if (!item) notFound();
  const moduleProblems = problems.filter((problem) => problem.module_id === item.module.id);
  const phase = path.phases.find((p) => p.modules.some((m) => m.slug === slug));

  const { module: mod } = item;
  const locked = item.state === "locked";
  const supabase = await createClient();
  const { data: resources } = locked
    ? { data: [] }
    : await supabase
        .from("resources")
        .select("id, title, description, kind, url")
        .eq("module_id", mod.id)
        .order("position");

  const nextInModule =
    progress.nextStep && progress.nextStep.modulePosition === mod.position ? progress.nextStep : null;

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-8">
        <Link href="/learn/curriculum" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Curriculum
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="eyebrow">
            {phase && phase.number > 0 ? `Phase ${phase.number}: ${phase.title} · ` : ""}{mod.label}
          </p>
          <ModuleStateBadge state={item.state} />
        </div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{mod.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">{mod.description}</p>
        <div className="mt-6 flex max-w-md items-center gap-3">
          <ProgressBar value={item.percent} label="Module completion" />
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {item.doneItems} of {item.totalItems} done
          </span>
        </div>
      </header>

      {locked ? (
        <div className="card flex items-start gap-4 p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-faint">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">This module is locked</h2>
            <p className="mt-1 text-ink-soft">{item.lockReason}.</p>
            {progress.nextStep ? (
              <ButtonLink href={progress.nextStep.href} className="mt-4">
                Continue with {progress.nextStep.title}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-labelledby="contents" className="space-y-4">
            <SectionHeading
              id="contents"
              title="Contents"
              action={
                <span className="text-ink-faint">
                  {mod.lessons.length} lessons · {formatDuration(item.durationMinutes)}
                </span>
              }
            />
            <div className="card p-3">
              <ModuleOutline progress={item} record={record} currentHref={progress.nextStep?.href ?? null} />
            </div>
            {nextInModule ? (
              <ButtonLink href={nextInModule.href} size="lg">
                Continue: {nextInModule.title}
              </ButtonLink>
            ) : null}

            {moduleProblems.length > 0 ? (
              <div className="space-y-4 pt-6">
                <SectionHeading
                  id="module-practice"
                  title="Practice problems"
                  action={
                    <Link href="/learn/practice" className="font-semibold text-accent underline-offset-4 hover:underline">
                      All practice
                    </Link>
                  }
                />
                <p className="text-sm text-ink-faint">
                  For practice: your code is saved for your own review and does not count towards module completion.
                </p>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {moduleProblems.map((problem) => (
                    <li key={problem.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                      <Link href={`/learn/practice/${problem.slug}`} className="font-semibold hover:text-accent">
                        {problem.title}
                      </Link>
                      <span className="flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={problem.difficulty} />
                        <PracticeStatusBadge status={practice.get(problem.id)?.status ?? "not_attempted"} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          <section aria-labelledby="module-resources" className="space-y-4">
            <SectionHeading id="module-resources" title="Module resources" />
            {resources && resources.length > 0 ? (
              <ResourceList resources={resources} />
            ) : (
              <p className="text-ink-soft">No extra resources for this module.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

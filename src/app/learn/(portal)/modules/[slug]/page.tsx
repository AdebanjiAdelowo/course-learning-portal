import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModuleOutline } from "@/components/module-outline";
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
  return { title: item ? `Module ${item.module.position}: ${item.module.title}` : "Module" };
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const { progress, record } = await requireCourseState();
  const item = progress.moduleProgress.find((m) => m.module.slug === slug);
  if (!item) notFound();

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
          <p className="eyebrow">Module {mod.position}</p>
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

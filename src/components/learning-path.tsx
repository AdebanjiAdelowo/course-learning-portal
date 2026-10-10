import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { hasPlan, type PathModule, type PathPhase } from "@/lib/domain/path";

import { Badge } from "./ui/badge";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** "1 available · 3 planned" for one phase. */
export function phaseAvailability(phase: Pick<PathPhase, "available" | "planned">): string {
  const parts: string[] = [];
  if (phase.available > 0) parts.push(`${phase.available} available`);
  if (phase.planned > 0) parts.push(`${phase.planned} planned`);
  return parts.join(" · ") || "No modules yet";
}

/**
 * One phase of the learning path as a collapsible section. A native <details> element, so it
 * works without JavaScript and is operable from the keyboard.
 */
export function PhaseSection({
  phase,
  defaultOpen,
  headingLevel = 2,
  children,
}: {
  phase: PathPhase;
  defaultOpen: boolean;
  /** Level of the phase title in the page's heading outline. */
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const headingId = `phase-${phase.id ?? "other"}`;
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-start gap-4 rounded-xl px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="eyebrow">{phase.number > 0 ? `Phase ${phase.number}` : "Unassigned"}</span>
            <span className="text-sm text-ink-faint">
              {count(phase.modules.length, "module")} · {phaseAvailability(phase)}
            </span>
          </span>
          <span id={headingId} role="heading" aria-level={headingLevel} className="mt-1.5 block font-serif text-2xl font-semibold leading-snug">
            {phase.title}
          </span>
          {phase.description ? <span className="mt-1.5 block text-ink-soft">{phase.description}</span> : null}
        </span>
        <ChevronDown className="mt-1 size-5 shrink-0 text-ink-faint transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line p-4 sm:p-5">{children}</div>
    </details>
  );
}

/**
 * A module that is on the path but not written yet: title, description and, when one exists,
 * its plan. It is never a link, and is always labelled as planned.
 */
export function PlannedModule({ module: mod }: { module: PathModule }) {
  const { plan } = mod;
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-paper p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="eyebrow">Module {mod.position}</p>
        <Badge>Planned</Badge>
      </div>
      <h3 className="mt-2 text-xl font-semibold">{mod.title}</h3>
      {mod.description ? <p className="mt-1.5 text-ink-soft">{mod.description}</p> : null}
      {hasPlan(plan) ? (
        <details className="mt-4 rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">What this module will cover</summary>
          <div className="space-y-4 border-t border-line px-4 py-4 text-[0.95rem]">
            {mod.prerequisiteTitles.length > 0 ? (
              <p className="text-ink-soft">
                <span className="font-semibold text-ink">Comes after: </span>
                {mod.prerequisiteTitles.join("; ")}
              </p>
            ) : null}
            {plan.objectives.length > 0 ? (
              <div>
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-soft">Learning objectives</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                  {plan.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {plan.lessons.length > 0 ? (
              <div>
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-soft">Planned lessons</h4>
                <ol className="mt-2 space-y-2">
                  {plan.lessons.map((lesson, index) => (
                    <li key={lesson.title} className="flex gap-3">
                      <span className="font-mono text-xs leading-6 text-ink-faint" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span>
                        <span className="font-semibold">{lesson.title}</span>
                        {lesson.summary ? <span className="block text-ink-soft">{lesson.summary}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {plan.practice.length + plan.visualizations.length > 0 ? (
              <p className="text-sm text-ink-faint">
                Also planned:{" "}
                {[
                  plan.practice.length > 0 ? count(plan.practice.length, "coding problem") : null,
                  plan.visualizations.length > 0 ? count(plan.visualizations.length, "visualization") : null,
                ]
                  .filter(Boolean)
                  .join(" and ")}
                .
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

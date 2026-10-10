/**
 * The learning path: every module of the course grouped into phases, whether it is published
 * or only planned. Pure functions, shared by the public website and the student portal, so the
 * two can never disagree about what is available.
 */

export interface PlannedLesson {
  title: string;
  summary: string;
}

/** What a module that is not written yet will teach. Every list may be empty. */
export interface ModulePlan {
  objectives: string[];
  lessons: PlannedLesson[];
  /** Slugs of modules to finish first. */
  prerequisites: string[];
  workedExamples: string[];
  practice: string[];
  visualizations: string[];
}

export interface PathPhaseInput {
  id: string;
  title: string;
  description: string;
  position: number;
  /** Preparation for the course proper (Python foundations): numbered apart from the core. */
  isPreparatory?: boolean;
}

/**
 * How a module is numbered for display. Numbering is presentation only: it is derived from
 * the order of the curriculum and never stored, so reordering or inserting a module can never
 * leave a stale number anywhere.
 */
export interface ModuleLabel {
  /** "P1" for a preparatory module, "1" for a core one. */
  code: string;
  /** "Python Module P1" or "DSA Module 1". */
  text: string;
  preparatory: boolean;
}

export const PREPARATORY_LABEL = "Python Module";
export const CORE_LABEL = "DSA Module";

/**
 * Numbers every module of the course, by slug. Preparatory modules count P1, P2, ... in course
 * order; all other modules count 1, 2, ... in course order, skipping the preparatory ones. A
 * planned module takes a number like any other, so numbers do not shift when it is published.
 */
export function moduleLabels(
  phases: readonly Pick<PathPhaseInput, "id" | "isPreparatory">[],
  modules: readonly Pick<PathModuleInput, "slug" | "position" | "phaseId">[],
): Map<string, ModuleLabel> {
  const preparatoryPhases = new Set(phases.filter((phase) => phase.isPreparatory).map((phase) => phase.id));
  const labels = new Map<string, ModuleLabel>();
  let preparatory = 0;
  let core = 0;
  for (const mod of [...modules].sort((a, b) => a.position - b.position)) {
    if (mod.phaseId !== null && preparatoryPhases.has(mod.phaseId)) {
      preparatory += 1;
      labels.set(mod.slug, { code: `P${preparatory}`, text: `${PREPARATORY_LABEL} P${preparatory}`, preparatory: true });
    } else {
      core += 1;
      labels.set(mod.slug, { code: String(core), text: `${CORE_LABEL} ${core}`, preparatory: false });
    }
  }
  return labels;
}

export interface PathModuleInput {
  slug: string;
  title: string;
  description: string;
  position: number;
  phaseId: string | null;
  isPublished: boolean;
  plan: ModulePlan;
}

export interface PathModule extends PathModuleInput {
  /** Titles of the prerequisite modules, in the order the plan lists them. */
  prerequisiteTitles: string[];
  label: ModuleLabel;
}

export interface PathPhase {
  /** null for modules that have not been assigned to a phase. */
  id: string | null;
  /** 1-based number shown to students; 0 for the unassigned group. */
  number: number;
  isPreparatory: boolean;
  title: string;
  description: string;
  modules: PathModule[];
  available: number;
  planned: number;
}

export interface LearningPath {
  phases: PathPhase[];
  available: number;
  planned: number;
  total: number;
}

function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "").slice(0, limit);
}

/** Reads a plan stored as JSON. Anything missing or malformed becomes an empty list. */
export function parseModulePlan(value: unknown): ModulePlan {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const lessons = Array.isArray(source.lessons)
    ? source.lessons.flatMap((item): PlannedLesson[] => {
        if (!item || typeof item !== "object") return [];
        const { title, summary } = item as Record<string, unknown>;
        if (typeof title !== "string" || title.trim() === "") return [];
        return [{ title, summary: typeof summary === "string" ? summary : "" }];
      })
    : [];
  return {
    objectives: strings(source.objectives, 12),
    lessons: lessons.slice(0, 20),
    prerequisites: strings(source.prerequisites, 12),
    workedExamples: strings(source.workedExamples, 12),
    practice: strings(source.practice, 20),
    visualizations: strings(source.visualizations, 12),
  };
}

export function hasPlan(plan: ModulePlan): boolean {
  return plan.objectives.length > 0 || plan.lessons.length > 0 || plan.prerequisites.length > 0;
}

/**
 * Groups modules into their phases, in phase order and then course order. Modules without a
 * phase (or whose phase is unknown) are collected into a final unnumbered group, so nothing
 * is ever dropped from the path.
 */
export function buildLearningPath(phases: readonly PathPhaseInput[], modules: readonly PathModuleInput[]): LearningPath {
  const titles = new Map(modules.map((mod) => [mod.slug, mod.title]));
  const labels = moduleLabels(phases, modules);
  const ordered = [...modules]
    .sort((a, b) => a.position - b.position)
    .map((mod): PathModule => ({
      ...mod,
      label: labels.get(mod.slug)!,
      prerequisiteTitles: mod.plan.prerequisites.flatMap((slug) => {
        const title = titles.get(slug);
        return title ? [title] : [];
      }),
    }));

  const group = (id: string | null, number: number, title: string, description: string, members: PathModule[], isPreparatory = false): PathPhase => ({
    id,
    number,
    isPreparatory,
    title,
    description,
    modules: members,
    available: members.filter((mod) => mod.isPublished).length,
    planned: members.filter((mod) => !mod.isPublished).length,
  });

  const known = new Set(phases.map((phase) => phase.id));
  const result = [...phases]
    .sort((a, b) => a.position - b.position)
    .map((phase, index) =>
      group(phase.id, index + 1, phase.title, phase.description, ordered.filter((mod) => mod.phaseId === phase.id), phase.isPreparatory ?? false),
    );

  const unassigned = ordered.filter((mod) => mod.phaseId === null || !known.has(mod.phaseId));
  if (unassigned.length > 0) {
    result.push(group(null, 0, phases.length > 0 ? "Other modules" : "Modules", "", unassigned));
  }

  const available = ordered.filter((mod) => mod.isPublished).length;
  return { phases: result, available, planned: ordered.length - available, total: ordered.length };
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** "1 module available · 33 modules planned" */
export function pathSummary(path: Pick<LearningPath, "available" | "planned">): string {
  const parts = [`${count(path.available, "module")} available`];
  if (path.planned > 0) parts.push(`${count(path.planned, "module")} planned`);
  return parts.join(" · ");
}

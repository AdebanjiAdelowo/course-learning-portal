import { describe, expect, it } from "vitest";

import { buildLearningPath, hasPlan, parseModulePlan, pathSummary, type PathModuleInput, type PathPhaseInput } from "@/lib/domain/path";

const emptyPlan = parseModulePlan({});

const phases: PathPhaseInput[] = [
  { id: "p2", title: "Core", description: "", position: 2 },
  { id: "p1", title: "Foundations", description: "First things", position: 1 },
  { id: "p3", title: "Empty phase", description: "", position: 3 },
];

const mod = (slug: string, position: number, phaseId: string | null, isPublished: boolean, plan = emptyPlan): PathModuleInput => ({
  slug,
  title: `Title of ${slug}`,
  description: "",
  position,
  phaseId,
  isPublished,
  plan,
});

describe("buildLearningPath", () => {
  const modules = [
    mod("sorting", 4, "p2", false, parseModulePlan({ prerequisites: ["basics", "missing-module"], objectives: ["Sort"] })),
    mod("basics", 2, "p1", true),
    mod("python", 1, "p1", false),
    mod("searching", 3, "p2", false),
  ];
  const path = buildLearningPath(phases, modules);

  it("orders phases by position, not by the order they were given in, and numbers them from 1", () => {
    expect(path.phases.map((phase) => [phase.number, phase.title])).toEqual([
      [1, "Foundations"],
      [2, "Core"],
      [3, "Empty phase"],
    ]);
  });

  it("orders modules inside a phase by course position", () => {
    expect(path.phases[0]!.modules.map((m) => m.slug)).toEqual(["python", "basics"]);
    expect(path.phases[1]!.modules.map((m) => m.slug)).toEqual(["searching", "sorting"]);
  });

  it("counts published and planned modules separately, per phase and overall", () => {
    expect(path.phases.map((phase) => [phase.available, phase.planned])).toEqual([
      [1, 1],
      [0, 2],
      [0, 0],
    ]);
    expect(path).toMatchObject({ available: 1, planned: 3, total: 4 });
  });

  it("never reports a planned module as available", () => {
    for (const phase of path.phases) {
      for (const m of phase.modules) {
        if (!m.isPublished) expect(phase.available).toBeLessThan(phase.modules.length);
      }
      expect(phase.available + phase.planned).toBe(phase.modules.length);
    }
  });

  it("resolves prerequisite slugs to titles and ignores unknown ones", () => {
    const sorting = path.phases[1]!.modules.find((m) => m.slug === "sorting")!;
    expect(sorting.prerequisiteTitles).toEqual(["Title of basics"]);
  });

  it("keeps modules without a phase, or with an unknown phase, in a final unnumbered group", () => {
    const loose = buildLearningPath(phases, [...modules, mod("extra", 9, null, true), mod("orphan", 8, "gone", false)]);
    const lastGroup = loose.phases[loose.phases.length - 1]!;
    expect(lastGroup).toMatchObject({ id: null, number: 0, title: "Other modules", available: 1, planned: 1 });
    expect(lastGroup.modules.map((m) => m.slug)).toEqual(["orphan", "extra"]);
    expect(loose.total).toBe(6);
  });

  it("handles a course with no phases at all", () => {
    const flat = buildLearningPath([], [mod("a", 1, null, true)]);
    expect(flat.phases).toHaveLength(1);
    expect(flat.phases[0]!.title).toBe("Modules");
  });

  it("handles an empty course", () => {
    expect(buildLearningPath([], [])).toEqual({ phases: [], available: 0, planned: 0, total: 0 });
  });
});

describe("pathSummary", () => {
  it("states available and planned modules separately, with correct plurals", () => {
    expect(pathSummary({ available: 1, planned: 33 })).toBe("1 module available · 33 modules planned");
    expect(pathSummary({ available: 2, planned: 1 })).toBe("2 modules available · 1 module planned");
    expect(pathSummary({ available: 0, planned: 5 })).toBe("0 modules available · 5 modules planned");
  });

  it("omits the planned part when everything is published", () => {
    expect(pathSummary({ available: 4, planned: 0 })).toBe("4 modules available");
  });
});

describe("parseModulePlan", () => {
  it("reads a well-formed plan", () => {
    const plan = parseModulePlan({
      objectives: ["One", "Two"],
      lessons: [{ title: "L1", summary: "S1" }, { title: "L2" }],
      prerequisites: ["a-b"],
      practice: ["P"],
      visualizations: ["V"],
      workedExamples: ["W"],
    });
    expect(plan.objectives).toEqual(["One", "Two"]);
    expect(plan.lessons).toEqual([
      { title: "L1", summary: "S1" },
      { title: "L2", summary: "" },
    ]);
    expect(hasPlan(plan)).toBe(true);
  });

  it("turns anything malformed into empty lists instead of throwing", () => {
    for (const value of [null, undefined, 3, "text", [], { objectives: "no", lessons: [1, null, { title: "" }, { summary: "x" }] }]) {
      const plan = parseModulePlan(value);
      expect(plan).toEqual({ objectives: [], lessons: [], prerequisites: [], workedExamples: [], practice: [], visualizations: [] });
      expect(hasPlan(plan)).toBe(false);
    }
  });

  it("drops entries that are not non-empty strings", () => {
    expect(parseModulePlan({ objectives: ["ok", "", "  ", 4, null, "also ok"] }).objectives).toEqual(["ok", "also ok"]);
  });
});

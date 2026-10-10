import { describe, expect, it } from "vitest";

import { buildLearningPath, hasPlan, moduleLabels, parseModulePlan, pathSummary, type PathModuleInput, type PathPhaseInput } from "@/lib/domain/path";

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

describe("module numbering", () => {
  const numbered = (phaseList: PathPhaseInput[], moduleList: PathModuleInput[]) =>
    [...moduleLabels(phaseList, moduleList)].sort((a, b) => moduleList.find((m) => m.slug === a[0])!.position - moduleList.find((m) => m.slug === b[0])!.position).map(([slug, label]) => [slug, label.text]);

  const course: PathPhaseInput[] = [
    { id: "prep", title: "Python foundations", description: "", position: 1, isPreparatory: true },
    { id: "core1", title: "Foundations", description: "", position: 2 },
    { id: "core2", title: "Sorting", description: "", position: 3 },
  ];
  const courseModules = [
    mod("python-essentials", 1, "prep", false),
    mod("python-collections", 2, "prep", false),
    mod("correctness-and-cost", 3, "core1", true),
    mod("recursion", 4, "core1", false),
    mod("two-pointers", 5, "core2", false),
  ];

  it("numbers preparatory modules P1, P2 and core modules from 1", () => {
    expect(numbered(course, courseModules)).toEqual([
      ["python-essentials", "Python Module P1"],
      ["python-collections", "Python Module P2"],
      ["correctness-and-cost", "DSA Module 1"],
      ["recursion", "DSA Module 2"],
      ["two-pointers", "DSA Module 3"],
    ]);
  });

  it("gives the first core module number 1 whatever its stored position is", () => {
    const labels = moduleLabels(course, courseModules);
    expect(courseModules.find((m) => m.slug === "correctness-and-cost")!.position).toBe(3);
    expect(labels.get("correctness-and-cost")).toEqual({ code: "1", text: "DSA Module 1", preparatory: false });
    expect(labels.get("python-essentials")).toEqual({ code: "P1", text: "Python Module P1", preparatory: true });
  });

  it("depends on course order, not on the order the rows arrive in or on gaps in positions", () => {
    const shuffled = [courseModules[4]!, courseModules[0]!, courseModules[3]!, courseModules[2]!, courseModules[1]!];
    expect(numbered(course, shuffled)).toEqual(numbered(course, courseModules));
    const gapped = courseModules.map((m) => ({ ...m, position: m.position * 10 + 7 }));
    expect(numbered(course, gapped).map(([, text]) => text)).toEqual(numbered(course, courseModules).map(([, text]) => text));
  });

  it("does not renumber when a planned module is published", () => {
    const published = courseModules.map((m) => ({ ...m, isPublished: true }));
    expect(numbered(course, published)).toEqual(numbered(course, courseModules));
  });

  it("numbers everything as core when no phase is preparatory, and unassigned modules as core", () => {
    const plain = course.map((phase) => ({ ...phase, isPreparatory: false }));
    expect(numbered(plain, courseModules).map(([, text]) => text)).toEqual(["DSA Module 1", "DSA Module 2", "DSA Module 3", "DSA Module 4", "DSA Module 5"]);
    expect(numbered(course, [...courseModules, mod("loose", 6, null, false)]).at(-1)).toEqual(["loose", "DSA Module 4"]);
  });

  it("keeps counting P numbers across a second preparatory phase placed later", () => {
    const phasesWithLatePrep: PathPhaseInput[] = [...course, { id: "prep2", title: "Maths refresher", description: "", position: 4, isPreparatory: true }];
    const labels = moduleLabels(phasesWithLatePrep, [...courseModules, mod("logs", 6, "prep2", false), mod("after", 7, "core2", false)]);
    expect(labels.get("logs")!.text).toBe("Python Module P3");
    expect(labels.get("after")!.text).toBe("DSA Module 4");
  });

  it("attaches the label to every module of the learning path and marks preparatory phases", () => {
    const path = buildLearningPath(course, courseModules);
    expect(path.phases.map((phase) => phase.isPreparatory)).toEqual([true, false, false]);
    expect(path.phases.flatMap((phase) => phase.modules.map((m) => m.label.code))).toEqual(["P1", "P2", "1", "2", "3"]);
    // Order is unchanged by numbering: the path still follows stored positions.
    expect(path.phases.flatMap((phase) => phase.modules.map((m) => m.position))).toEqual([1, 2, 3, 4, 5]);
  });
});

import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { course } from "../../seed/course";

const modules = course.phases.flatMap((phase) => phase.modules.map((mod) => ({ mod, phase })));
const position = new Map(modules.map(({ mod }, index) => [mod.slug, index]));
const published = modules.filter(({ mod }) => mod.published !== false);
const planned = modules.filter(({ mod }) => mod.published === false);

describe("curriculum blueprint", () => {
  it("has eight phases, in the intended order, opening with Python foundations", () => {
    expect(course.phases.map((phase) => phase.slug)).toEqual([
      "python-foundations",
      "foundations",
      "linear-structures-and-sorting",
      "hashing-and-trees",
      "graphs",
      "design-techniques",
      "strings-and-advanced-structures",
      "limits-and-synthesis",
    ]);
  });

  it("has 34 modules with unique, well-formed slugs", () => {
    expect(modules).toHaveLength(34);
    expect(new Set(modules.map(({ mod }) => mod.slug)).size).toBe(34);
    for (const { mod } of modules) expect(mod.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(course.phases.map((phase) => phase.slug)).size).toBe(course.phases.length);
  });

  it("keeps the identifiers of the thirty original modules", () => {
    const original = [
      "correctness-and-cost", "recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists", "stacks-and-queues",
      "elementary-sorting", "merge-sort-and-divide-and-conquer", "quicksort-and-selection", "sorting-lower-bounds", "hash-tables",
      "binary-trees", "binary-search-trees", "balanced-search-trees", "heaps-and-priority-queues", "graph-representations-and-bfs",
      "depth-first-search", "dijkstra", "bellman-ford-and-all-pairs", "minimum-spanning-trees", "union-find", "greedy-algorithms",
      "dynamic-programming-foundations", "dynamic-programming-sequences", "dynamic-programming-advanced", "backtracking",
      "string-matching", "tries", "range-queries", "network-flow", "intractability-and-capstone",
    ];
    expect(original).toHaveLength(30);
    for (const slug of original) expect(position.has(slug)).toBe(true);
    // Their relative order is unchanged by the additions.
    const order = original.map((slug) => position.get(slug)!);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("publishes exactly one module, and it does not wait for the planned ones before it", () => {
    expect(published.map(({ mod }) => mod.slug)).toEqual(["correctness-and-cost"]);
    expect(published[0]!.mod.requiresPrevious).toBe(false);
    expect(planned).toHaveLength(33);
  });

  it("gives planned modules no lessons, quiz, project or problems: a title is not content", () => {
    for (const { mod } of planned) {
      expect(mod.lessons ?? []).toEqual([]);
      expect(mod.quiz).toBeUndefined();
      expect(mod.project).toBeUndefined();
      expect(mod.problems ?? []).toEqual([]);
    }
  });

  it("keeps the published module's five lessons in their original order", () => {
    expect(published[0]!.mod.lessons!.map((lesson) => lesson.slug)).toEqual([
      "algorithms-and-correctness",
      "counting-cost",
      "asymptotic-notation",
      "binary-search",
      "insertion-sort",
    ]);
  });

  it("has a lesson file and a complete problem folder for everything it publishes", () => {
    for (const { mod } of published) {
      for (const lesson of mod.lessons ?? []) {
        expect(existsSync(path.join("seed", "lessons", `${lesson.file ?? lesson.slug}.md`))).toBe(true);
      }
      for (const problem of mod.problems ?? []) {
        for (const file of ["problem.md", "editorial.md", "starter.py", "solution.py", "tests.json"]) {
          expect(existsSync(path.join("seed", "problems", problem.slug, file))).toBe(true);
        }
        expect(problem.hints.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("uses all four question types in the module quiz, with eight questions", () => {
    const quiz = published[0]!.mod.quiz!;
    expect(quiz.questions).toHaveLength(8);
    expect(new Set(quiz.questions.map((question) => question.type))).toEqual(
      new Set(["multiple_choice", "multiple_select", "true_false", "short_answer"]),
    );
    for (const question of quiz.questions) {
      expect(question.explanation.length).toBeGreaterThan(20);
      if (question.type === "multiple_choice") expect(question.answer).toBeLessThan(question.options.length);
      if (question.type === "multiple_select") {
        expect(question.answers.length).toBeGreaterThan(0);
        for (const index of question.answers) expect(index).toBeLessThan(question.options.length);
      }
      if (question.type === "short_answer") expect(question.accepted.length).toBeGreaterThan(0);
    }
  });
});

describe("the modules added for beginners and array techniques", () => {
  const added = ["python-essentials", "python-collections-and-testing", "two-pointers", "sliding-window"];
  const bySlug = new Map(modules.map(({ mod, phase }) => [mod.slug, { mod, phase }]));

  it("places Python foundations first and the array techniques after arrays and before stacks", () => {
    expect(position.get("python-essentials")).toBe(0);
    expect(position.get("python-collections-and-testing")).toBe(1);
    expect(bySlug.get("two-pointers")!.phase.slug).toBe("linear-structures-and-sorting");
    expect(position.get("two-pointers")!).toBeGreaterThan(position.get("arrays-and-amortised-analysis")!);
    expect(position.get("sliding-window")!).toBe(position.get("two-pointers")! + 1);
    expect(position.get("sliding-window")!).toBeLessThan(position.get("stacks-and-queues")!);
    expect(position.get("sliding-window")!).toBeLessThan(position.get("hash-tables")!);
  });

  it("marks each of them as planned, with objectives, lessons and exercises defined", () => {
    for (const slug of added) {
      const { mod } = bySlug.get(slug)!;
      expect(mod.published).toBe(false);
      expect(mod.plan!.objectives.length).toBeGreaterThanOrEqual(4);
      expect(mod.plan!.lessons.length).toBeGreaterThanOrEqual(4);
      expect(mod.plan!.practice!.length).toBeGreaterThanOrEqual(4);
      expect(mod.plan!.workedExamples!.length).toBeGreaterThanOrEqual(3);
      for (const lesson of mod.plan!.lessons) expect(lesson.summary.length).toBeGreaterThan(20);
    }
  });

  it("only names prerequisites that exist and come earlier in the course", () => {
    for (const { mod } of modules) {
      for (const prerequisite of mod.plan?.prerequisites ?? []) {
        expect(position.has(prerequisite), `${mod.slug} requires unknown module ${prerequisite}`).toBe(true);
        expect(position.get(prerequisite)!).toBeLessThan(position.get(mod.slug)!);
      }
    }
    expect(bySlug.get("sliding-window")!.mod.plan!.prerequisites).toContain("two-pointers");
    expect(bySlug.get("two-pointers")!.mod.plan!.prerequisites).toContain("correctness-and-cost");
  });

  it("covers the required Python topics across the two foundation modules", () => {
    const text = added
      .slice(0, 2)
      .map((slug) => JSON.stringify(bySlug.get(slug)!.mod))
      .join(" ")
      .toLowerCase();
    for (const topic of [
      "variables", "types", "operators", "condition", "loops", "functions", "lists", "tuples", "dictionaries", "sets",
      "strings", "input", "recursi", "mutab", "debug", "test",
    ]) {
      expect(text, `Python foundations should mention ${topic}`).toContain(topic);
    }
  });

  it("covers the required two-pointer and sliding-window topics", () => {
    const twoPointers = JSON.stringify(bySlug.get("two-pointers")!.mod).toLowerCase();
    for (const topic of ["opposite-direction", "same-direction", "sorted", "pair", "duplicates", "linear", "mistakes"]) {
      expect(twoPointers).toContain(topic);
    }
    const window = JSON.stringify(bySlug.get("sliding-window")!.mod).toLowerCase();
    for (const topic of ["fixed-size", "variable-size", "running sum", "frequency map", "longest", "shortest", "linear", "mistakes"]) {
      expect(window).toContain(topic);
    }
    expect(bySlug.get("sliding-window")!.mod.plan!.visualizations!.length).toBeGreaterThan(0);
  });

  it("includes at least one detailed lesson specification with all twelve sections", () => {
    const specs = modules.flatMap(({ mod }) => (mod.plan?.lessons ?? []).flatMap((lesson) => (lesson.spec ? [lesson.spec] : [])));
    expect(specs.length).toBeGreaterThanOrEqual(1);
    for (const spec of specs) {
      expect(spec.sections.map((section) => section.heading)).toEqual([
        "Motivation", "Intuition", "Visualization", "Formal explanation", "Pseudocode", "Python implementation",
        "Correctness", "Complexity", "Worked example", "Practice", "Assessment", "Further study",
      ]);
      expect(spec.objectives.length).toBeGreaterThanOrEqual(3);
      expect(spec.exercises.length).toBeGreaterThanOrEqual(2);
      for (const section of spec.sections) expect(section.covers.length).toBeGreaterThan(30);
    }
  });
});

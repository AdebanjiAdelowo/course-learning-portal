import { existsSync, readFileSync } from "node:fs";
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

  it("publishes the two Python modules and DSA Modules 1 to 4; only the first three never wait for another", () => {
    expect(published.map(({ mod }) => mod.slug)).toEqual([
      "python-essentials", "python-collections-and-testing", "correctness-and-cost",
      "recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists",
    ]);
    // Python preparation is optional: a student who already knows Python can start at DSA Module 1.
    for (const { mod } of published.slice(0, 3)) expect(mod.requiresPrevious).toBe(false);
    // DSA Modules 2 to 4 open once the lessons of the module before them are complete.
    for (const { mod } of published.slice(3)) expect(mod.requiresPrevious).toBe(true);
    expect(planned).toHaveLength(28);
  });

  it("keeps all 28 planned modules empty, so none can be dressed up as published content", () => {
    expect(planned).toHaveLength(28);
    for (const { mod } of planned) {
      expect(mod.lessons ?? []).toEqual([]);
      expect(mod.quiz).toBeUndefined();
      expect(mod.project).toBeUndefined();
      expect(mod.problems ?? []).toEqual([]);
    }
  });

  it("keeps the first DSA module's five lessons in their original order", () => {
    const dsa = published.find(({ mod }) => mod.slug === "correctness-and-cost")!;
    expect(dsa.mod.lessons!.map((lesson) => lesson.slug)).toEqual([
      "algorithms-and-correctness",
      "counting-cost",
      "asymptotic-notation",
      "binary-search",
      "insertion-sort",
    ]);
  });

  it("marks only the Python phase as preparatory", () => {
    expect(course.phases.filter((phase) => phase.preparatory).map((phase) => phase.slug)).toEqual(["python-foundations"]);
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

  it("gives every published module a quiz with all four question types, a project and coding problems", () => {
    for (const { mod } of published) {
      const quiz = mod.quiz!;
      expect(quiz.questions.length, mod.slug).toBeGreaterThanOrEqual(8);
      expect(quiz.passPercent).toBe(70);
      expect(new Set(quiz.questions.map((question) => question.type)), mod.slug).toEqual(
        new Set(["multiple_choice", "multiple_select", "true_false", "short_answer"]),
      );
      for (const question of quiz.questions) {
        expect(question.explanation.length).toBeGreaterThan(20);
        if (question.type === "multiple_choice") {
          expect(question.answer).toBeLessThan(question.options.length);
          expect(new Set(question.options).size, `duplicate option in ${mod.slug}`).toBe(question.options.length);
        }
        if (question.type === "multiple_select") {
          expect(question.answers.length).toBeGreaterThan(0);
          expect(question.answers.length).toBeLessThan(question.options.length);
          for (const index of question.answers) expect(index).toBeLessThan(question.options.length);
        }
        if (question.type === "short_answer") expect(question.accepted.length).toBeGreaterThan(0);
      }

      const project = mod.project!;
      expect(project.rubric.reduce((sum, row) => sum + row.points, 0), mod.slug).toBe(100);
      expect(project.requirements.length).toBeGreaterThanOrEqual(4);
      expect((mod.problems ?? []).length, mod.slug).toBeGreaterThanOrEqual(4);
      expect(new Set((mod.problems ?? []).map((problem) => problem.difficulty)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it("has unique slugs for lessons, quizzes, projects and problems across the course", () => {
    for (const pick of [
      (m: (typeof modules)[number]["mod"]) => (m.lessons ?? []).map((l) => l.slug),
      (m: (typeof modules)[number]["mod"]) => (m.quiz ? [m.quiz.slug] : []),
      (m: (typeof modules)[number]["mod"]) => (m.project ? [m.project.slug] : []),
      (m: (typeof modules)[number]["mod"]) => (m.problems ?? []).map((p) => p.slug),
    ]) {
      const slugs = modules.flatMap(({ mod }) => pick(mod));
      expect(new Set(slugs).size).toBe(slugs.length);
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

  it("has written the two Python modules in full: six lessons each, covering the required topics in order", () => {
    expect(bySlug.get("python-essentials")!.mod.lessons!.map((lesson) => lesson.slug)).toEqual([
      "values-variables-and-types",
      "operators-and-expressions",
      "conditionals",
      "loops-and-iteration",
      "functions-and-parameters",
      "strings-and-input-output",
    ]);
    expect(bySlug.get("python-collections-and-testing")!.mod.lessons!.map((lesson) => lesson.slug)).toEqual([
      "lists-and-tuples",
      "dictionaries-and-sets",
      "references-identity-and-mutability",
      "recursion-basics",
      "debugging-and-testing",
      "efficient-python-functions",
    ]);
    for (const slug of added.slice(0, 2)) {
      const { mod } = bySlug.get(slug)!;
      expect(mod.published).not.toBe(false);
      for (const lesson of mod.lessons!) {
        expect(lesson.objectives.length).toBeGreaterThanOrEqual(4);
        expect(lesson.summary.length).toBeGreaterThan(40);
      }
    }
  });

  it("gives every Python lesson the full lesson structure and at least one runnable example", () => {
    const required = [
      "Motivation", "Prerequisites", "The idea", "Syntax and semantics", "Worked example", "Try it",
      "Common mistakes", "Practice", "Check your understanding", "Summary", "Further study",
    ];
    for (const slug of added.slice(0, 2)) {
      for (const lesson of bySlug.get(slug)!.mod.lessons!) {
        const body = readFileSync(path.join("seed", "lessons", `${lesson.slug}.md`), "utf8");
        const headings = [...body.matchAll(/^## \d+\. (.+)$/gm)].map((match) => match[1]);
        expect(headings, lesson.slug).toEqual(required);
        expect(body, `${lesson.slug} needs a runnable block`).toMatch(/^```python-run$/m);
        expect((body.match(/^```python$/gm) ?? []).length, `${lesson.slug} needs checked examples`).toBeGreaterThanOrEqual(2);
        expect(body.length, lesson.slug).toBeGreaterThan(5000);
        // Site prose avoids em and en dashes.
        expect(body).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });

  it("keeps the two array-technique modules planned, with objectives, lessons and exercises defined", () => {
    for (const slug of added.slice(2)) {
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
});

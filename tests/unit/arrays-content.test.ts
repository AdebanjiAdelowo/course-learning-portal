import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arraysModule } from "../../seed/arrays-module";

describe("arrays module authoring definition", () => {
  it("keeps the established slug, title and six complete lesson files", () => {
    expect(arraysModule.slug).toBe("arrays-and-amortised-analysis");
    expect(arraysModule.published).toBe(false);
    expect(arraysModule.title).toBe("Arrays, dynamic arrays and amortised analysis");
    expect(arraysModule.lessons).toHaveLength(6);
    for (const lesson of arraysModule.lessons!) {
      const body = readFileSync(`seed/lessons/${lesson.slug}.md`, "utf8");
      expect(body).toMatch(/^## .*Complexity|^## .*complexity|^## .*cost|^## .*analysis/m);
      expect(body).toContain("```python-run");
      expect(body.toLowerCase()).toContain("correctness");
      expect(body.toLowerCase()).toContain("invariant");
      expect(body.length).toBeGreaterThan(3000);
    }
  });
  it("provides ten explained questions and a 100-point project rubric", () => {
    expect(arraysModule.quiz!.questions).toHaveLength(10);
    expect(new Set(arraysModule.quiz!.questions.map(q => q.type)).size).toBe(4);
    for (const question of arraysModule.quiz!.questions) expect(question.explanation.length).toBeGreaterThan(30);
    expect(arraysModule.project!.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100);
  });
  it("keeps public samples disjoint from hidden tests and array inputs bounded", () => {
    expect(arraysModule.problems).toHaveLength(6);
    for (const problem of arraysModule.problems!) {
      const tests = JSON.parse(readFileSync(`seed/problems/${problem.slug}/tests.json`, "utf8")) as { sample: { args: unknown[] }[]; hidden: { args: unknown[] }[] };
      const visible = new Set(tests.sample.map(t => JSON.stringify(t.args)));
      expect(tests.sample.length).toBeGreaterThanOrEqual(2);
      expect(tests.hidden.length).toBeGreaterThanOrEqual(5);
      expect(tests.hidden.some(t => visible.has(JSON.stringify(t.args)))).toBe(false);
      for (const t of [...tests.sample, ...tests.hidden]) for (const arg of t.args) if (Array.isArray(arg)) expect(arg.length).toBeLessThanOrEqual(100);
    }
  });
});

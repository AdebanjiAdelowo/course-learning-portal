import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recursionModule } from "../../seed/recursion-module";

describe("recursion module authoring definition", () => {
  it("keeps the established slug, title and six complete lesson files", () => {
    expect(recursionModule.slug).toBe("recursion-and-induction");
    expect(recursionModule.published).toBe(false);
    expect(recursionModule.title).toBe("Recursion, induction and recurrences");
    expect(recursionModule.lessons).toHaveLength(6);
    for (const lesson of recursionModule.lessons!) {
      const body = readFileSync(`seed/lessons/${lesson.slug}.md`, "utf8");
      expect(body).toMatch(/^## .*Complexity|^## .*Cost analysis|^## .*Time and|^## .*Space follows/m);
      expect(body).toContain("```python-run");
      expect(body.toLowerCase()).toContain("correctness");
      expect(body.toLowerCase()).toContain("termination");
      expect(body.length).toBeGreaterThan(3000);
    }
  });
  it("provides ten explained questions and a 100-point project rubric", () => {
    expect(recursionModule.quiz!.questions).toHaveLength(10);
    expect(new Set(recursionModule.quiz!.questions.map(q => q.type)).size).toBe(4);
    for (const question of recursionModule.quiz!.questions) expect(question.explanation.length).toBeGreaterThan(30);
    expect(recursionModule.project!.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100);
  });
  it("keeps public samples disjoint from hidden tests and recursion inputs bounded", () => {
    expect(recursionModule.problems).toHaveLength(5);
    for (const problem of recursionModule.problems!) {
      const tests = JSON.parse(readFileSync(`seed/problems/${problem.slug}/tests.json`, "utf8")) as { sample: { args: unknown[] }[]; hidden: { args: unknown[] }[] };
      const visible = new Set(tests.sample.map(t => JSON.stringify(t.args)));
      expect(tests.sample.length).toBeGreaterThanOrEqual(2);
      expect(tests.hidden.length).toBeGreaterThanOrEqual(5);
      expect(tests.hidden.some(t => visible.has(JSON.stringify(t.args)))).toBe(false);
      for (const t of [...tests.sample, ...tests.hidden]) for (const arg of t.args) if (Array.isArray(arg)) expect(arg.length).toBeLessThanOrEqual(100);
    }
  });
});

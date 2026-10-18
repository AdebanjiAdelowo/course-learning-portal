import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { course } from "../../seed/course";
import { twoPointersModule } from "../../seed/two-pointers-module";
import { slidingWindowModule } from "../../seed/sliding-window-module";
import { parseVizBlock } from "@/lib/viz/parse";
import type { SeedModule } from "../../seed/types";

const modules = course.phases.flatMap((phase) => phase.modules);
const SECTIONS = ["## Learning objectives", "## Worked example", "## Correctness", "## Complexity", "## Common mistakes", "## Practice exercises"];

function checkModule(mod: SeedModule, expectedViz: string[]) {
  it("keeps its slug and position, stays an unpublished draft, and keeps a student-visible plan", () => {
    expect(mod.published).toBe(false);
    expect(mod.requiresPrevious).toBe(true);
    expect(mod.plan!.objectives.length).toBeGreaterThanOrEqual(4);
    expect(mod.plan!.lessons.map((lesson) => lesson.title)).toEqual(mod.lessons!.map((lesson) => lesson.title));
  });

  it("has six complete lessons with every required section, runnable Python and no dashes", () => {
    expect(mod.lessons).toHaveLength(6);
    const seenViz: string[] = [];
    for (const lesson of mod.lessons!) {
      const body = readFileSync(`seed/lessons/${lesson.slug}.md`, "utf8");
      for (const section of SECTIONS) expect(body, `${lesson.slug}: ${section}`).toContain(section);
      expect(body, lesson.slug).toContain("```python-run");
      expect(body.toLowerCase(), lesson.slug).toContain("invariant");
      expect(body.length, lesson.slug).toBeGreaterThan(5000);
      expect(body, lesson.slug).not.toMatch(/[–—]/);
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);
      for (const match of body.matchAll(/```viz\n([\s\S]*?)```/g)) {
        const parsed = parseVizBlock(match[1]!);
        expect(parsed.ok, `${lesson.slug} viz block`).toBe(true);
        if (parsed.ok) seenViz.push(`${parsed.value.algorithm.id}:${parsed.value.input.mode}`);
      }
    }
    expect(seenViz.sort()).toEqual([...expectedViz].sort());
  });

  it("has a ten-question quiz using all four types with explanations, and a 100-point rubric", () => {
    const questions = mod.quiz!.questions;
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.type)).size).toBe(4);
    for (const q of questions) {
      expect(q.explanation.length).toBeGreaterThan(40);
      if (q.type === "multiple_choice") expect(q.answer).toBeLessThan(q.options.length);
      if (q.type === "multiple_select") for (const a of q.answers) expect(a).toBeLessThan(q.options.length);
      if (q.type === "short_answer") expect(q.accepted.length).toBeGreaterThan(0);
    }
    expect(mod.project!.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100);
    expect(mod.project!.requirements.length).toBeGreaterThanOrEqual(6);
  });

  it("has six problems whose samples are disjoint from hidden tests and whose statements do not reveal the solution", () => {
    expect(mod.problems).toHaveLength(6);
    for (const problem of mod.problems!) {
      const dir = `seed/problems/${problem.slug}`;
      const tests = JSON.parse(readFileSync(`${dir}/tests.json`, "utf8")) as { sample: { args: unknown[] }[]; hidden: { args: unknown[] }[] };
      const visible = new Set(tests.sample.map((t) => JSON.stringify(t.args)));
      expect(tests.sample.length).toBeGreaterThanOrEqual(2);
      expect(tests.hidden.length).toBeGreaterThanOrEqual(20);
      expect(tests.hidden.some((t) => visible.has(JSON.stringify(t.args))), problem.slug).toBe(false);
      for (const t of [...tests.sample, ...tests.hidden]) for (const arg of t.args) if (Array.isArray(arg) || typeof arg === "string") expect(arg.length).toBeLessThanOrEqual(200);
      const solution = readFileSync(`${dir}/solution.py`, "utf8");
      const starter = readFileSync(`${dir}/starter.py`, "utf8");
      const statement = readFileSync(`${dir}/problem.md`, "utf8");
      const logic = solution.split("\n").map((line) => line.trim()).filter((line) => line.length > 15 && !line.startsWith("def "));
      expect(logic.length, problem.slug).toBeGreaterThan(0);
      for (const line of logic) {
        expect(starter, `${problem.slug} starter reveals: ${line}`).not.toContain(line);
        expect(statement, `${problem.slug} statement reveals: ${line}`).not.toContain(line);
      }
      expect(starter).toMatch(/\n\s+pass\n?$/);
      expect(problem.hints.length).toBeGreaterThanOrEqual(3);
      expect(statement).not.toMatch(/[–—]/);
    }
  });
}

describe("Phase 4 curriculum integration", () => {
  it("places both drafts at their established positions without changing any other module", () => {
    expect(course.phases).toHaveLength(8);
    expect(modules).toHaveLength(34);
    expect(modules.indexOf(twoPointersModule) + 1).toBe(7);
    expect(modules.indexOf(slidingWindowModule) + 1).toBe(8);
    expect(modules.filter((mod) => mod.published !== false)).toHaveLength(6);
    expect(modules.filter((mod) => mod.published === false)).toHaveLength(28);
    expect(modules.slice(5, 10).map((mod) => mod.slug)).toEqual(["linked-lists", "two-pointers", "sliding-window", "stacks-and-queues", "elementary-sorting"]);
  });
});

describe("two pointers module", () => checkModule(twoPointersModule, ["two-pointers:opposite", "two-pointers:same"]));
describe("sliding window module", () => checkModule(slidingWindowModule, ["sliding-window:fixed", "sliding-window:shortest", "sliding-window:longest-distinct"]));

describe("numeric quiz answers, recomputed by brute force", () => {
  const short = (mod: SeedModule, fragment: string) => {
    const q = mod.quiz!.questions.find((question) => question.type === "short_answer" && question.prompt.includes(fragment));
    if (!q || q.type !== "short_answer") throw new Error(`no short-answer question containing ${fragment}`);
    return q.accepted[0];
  };
  it("matches the two pointers answers", () => {
    const heights = [1, 8, 6, 2, 5, 4, 8, 3, 7];
    let best = 0;
    for (let i = 0; i < heights.length; i++) for (let j = i + 1; j < heights.length; j++) best = Math.max(best, (j - i) * Math.min(heights[i]!, heights[j]!));
    expect(short(twoPointersModule, "wall heights")).toBe(String(best));
    expect(short(twoPointersModule, "list of 9 values")).toBe(String(9 - 1));
  });
  it("matches the sliding window answers", () => {
    const values = [2, 3, 1, 2, 4, 3];
    let shortest = Infinity;
    for (let i = 0; i < values.length; i++) for (let j = i; j < values.length; j++) if (values.slice(i, j + 1).reduce((a, b) => a + b, 0) >= 7) shortest = Math.min(shortest, j - i + 1);
    expect(short(slidingWindowModule, "target 7")).toBe(String(shortest));
    const list = [1, 2, 1, 2, 3];
    let exactly = 0;
    for (let i = 0; i < list.length; i++) for (let j = i; j < list.length; j++) if (new Set(list.slice(i, j + 1)).size === 2) exactly++;
    expect(short(slidingWindowModule, "exactly 2 distinct")).toBe(String(exactly));
  });
});

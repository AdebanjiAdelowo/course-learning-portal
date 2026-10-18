import { describe, expect, it } from "vitest";

import { computeCourseProgress, emptyRecord, type OutlineModule, type StudentRecord } from "@/lib/domain/progress";
import { course } from "../../seed/course";

const NOW = new Date("2026-10-17T12:00:00Z");

// The outline a student is given: the published seed modules, in course order, as the portal builds it.
const outline: OutlineModule[] = course.phases
  .flatMap((phase) => phase.modules)
  .filter((mod) => mod.published !== false)
  .map((mod, index) => ({
    id: mod.slug,
    slug: mod.slug,
    label: mod.slug,
    title: mod.title,
    description: mod.description,
    position: index + 1,
    availableFrom: null,
    requiresPrevious: mod.requiresPrevious ?? true,
    lessons: (mod.lessons ?? []).map((lesson, n) => ({ id: lesson.slug, slug: lesson.slug, title: lesson.title, durationMinutes: lesson.durationMinutes ?? 30, position: n + 1 })),
    quizzes: mod.quiz ? [{ id: mod.quiz.slug, slug: mod.quiz.slug, title: mod.quiz.title, passPercent: mod.quiz.passPercent ?? 70 }] : [],
    projects: mod.project ? [{ id: mod.project.slug, slug: mod.project.slug, title: mod.project.title, dueAt: null }] : [],
  }));

const lessonsOf = (slug: string) => outline.find((mod) => mod.slug === slug)!.lessons.map((lesson) => lesson.id);
const done = (...ids: string[]): StudentRecord => ({ ...emptyRecord(), completedLessonIds: new Set(ids) });
const states = (record: StudentRecord) =>
  Object.fromEntries(computeCourseProgress(outline, record, { now: NOW }).moduleProgress.map((m) => [m.module.slug, m.state]));

const PYTHON = [...lessonsOf("python-essentials"), ...lessonsOf("python-collections-and-testing")];
const DSA1 = lessonsOf("correctness-and-cost");
const RECURSION = lessonsOf("recursion-and-induction");
const ARRAYS = lessonsOf("arrays-and-amortised-analysis");

describe("unlocking across the published Phase 3 modules", () => {
  it("gives a student exactly the eight published modules, with nothing planned in the outline", () => {
    expect(outline.map((mod) => mod.slug)).toEqual([
      "python-essentials", "python-collections-and-testing", "correctness-and-cost",
      "recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists",
      "two-pointers", "sliding-window",
    ]);
  });

  it("continues the chain: two pointers after the linked-list lessons, sliding window after the two-pointer lessons", () => {
    const LINKED = lessonsOf("linked-lists");
    const POINTERS = lessonsOf("two-pointers");
    expect(states(done(...DSA1, ...RECURSION, ...ARRAYS))).toMatchObject({ "two-pointers": "locked", "sliding-window": "locked" });
    expect(states(done(...DSA1, ...RECURSION, ...ARRAYS, ...LINKED))).toMatchObject({ "two-pointers": "available", "sliding-window": "locked" });
    expect(states(done(...DSA1, ...RECURSION, ...ARRAYS, ...LINKED, ...POINTERS))).toMatchObject({ "two-pointers": "in_progress", "sliding-window": "available" });
  });

  it("opens Python and DSA Module 1 to a new student and keeps DSA Modules 2 to 4 locked", () => {
    const progress = computeCourseProgress(outline, emptyRecord(), { now: NOW });
    expect(states(emptyRecord())).toMatchObject({
      "python-essentials": "available", "python-collections-and-testing": "available", "correctness-and-cost": "available",
      "recursion-and-induction": "locked", "arrays-and-amortised-analysis": "locked", "linked-lists": "locked",
    });
    expect(progress.nextStep).toMatchObject({ kind: "lesson", href: `/learn/lessons/${PYTHON[0]}` });
  });

  it("keeps recursion locked while any DSA Module 1 lesson is unfinished, naming the module to finish", () => {
    const record = done(...PYTHON, ...DSA1.slice(0, -1));
    const recursion = computeCourseProgress(outline, record, { now: NOW }).moduleProgress.find((m) => m.module.slug === "recursion-and-induction")!;
    expect(recursion.state).toBe("locked");
    expect(recursion.lockReason).toBe(`Complete the lessons in "${outline.find((mod) => mod.slug === "correctness-and-cost")!.title}" first`);
    expect(computeCourseProgress(outline, record, { now: NOW }).nextStep).toMatchObject({ kind: "lesson", href: `/learn/lessons/${DSA1.at(-1)}` });
  });

  it("opens recursion once every DSA Module 1 lesson is done, without requiring its quiz or project", () => {
    const record = done(...PYTHON, ...DSA1);
    expect(states(record)).toMatchObject({ "recursion-and-induction": "available", "arrays-and-amortised-analysis": "locked", "linked-lists": "locked" });
    expect(computeCourseProgress(outline, record, { now: NOW }).nextStep).toMatchObject({ kind: "lesson", href: `/learn/lessons/${RECURSION[0]}` });
  });

  it("does not need the Python modules: DSA Module 1 lessons alone unlock recursion", () => {
    expect(states(done(...DSA1))["recursion-and-induction"]).toBe("available");
  });

  it("opens arrays after the recursion lessons, and linked lists after the arrays lessons", () => {
    expect(states(done(...DSA1, ...RECURSION))).toMatchObject({ "arrays-and-amortised-analysis": "available", "linked-lists": "locked" });
    expect(states(done(...DSA1, ...RECURSION, ...ARRAYS))).toMatchObject({ "arrays-and-amortised-analysis": "in_progress", "linked-lists": "available" });
  });

  it("gates each module on its immediate predecessor only, as documented", () => {
    // Arrays stays locked without the recursion lessons. A student cannot reach "arrays lessons done,
    // recursion not done": the database refuses progress in a locked module (see the integration tests).
    const record = done(...DSA1, ...ARRAYS);
    expect(states(record)["arrays-and-amortised-analysis"]).toBe("locked");
    expect(states(record)["linked-lists"]).toBe("available");
  });
});

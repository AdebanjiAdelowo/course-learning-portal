import { describe, expect, it } from "vitest";

import {
  computeCourseProgress,
  emptyRecord,
  lessonNeighbours,
  percentOf,
  type OutlineModule,
  type StudentRecord,
  type SubmissionStatus,
} from "@/lib/domain/progress";

const NOW = new Date("2026-10-07T12:00:00Z");

function makeModule(position: number, overrides: Partial<OutlineModule> = {}): OutlineModule {
  return {
    id: `m${position}`,
    slug: `module-${position}`,
    label: `DSA Module ${position}`,
    title: `Module ${position}`,
    description: "",
    position,
    availableFrom: null,
    requiresPrevious: true,
    lessons: [1, 2].map((n) => ({
      id: `m${position}-l${n}`,
      slug: `m${position}-l${n}`,
      title: `Lesson ${position}.${n}`,
      durationMinutes: 20,
      position: n,
    })),
    quizzes: [{ id: `m${position}-q`, slug: `m${position}-q`, title: `Quiz ${position}`, passPercent: 70 }],
    projects: [{ id: `m${position}-p`, slug: `m${position}-p`, title: `Project ${position}`, dueAt: null }],
    ...overrides,
  };
}

function record(input: {
  lessons?: string[];
  quizzes?: Record<string, { bestPercent: number; passed: boolean; attempts?: number }>;
  projects?: Record<string, SubmissionStatus>;
}): StudentRecord {
  return {
    completedLessonIds: new Set(input.lessons ?? []),
    quizStandings: new Map(
      Object.entries(input.quizzes ?? {}).map(([id, s]) => [id, { attempts: s.attempts ?? 1, ...s }]),
    ),
    projectStatuses: new Map(Object.entries(input.projects ?? {})),
  };
}

const course = [makeModule(1, { requiresPrevious: false }), makeModule(2)];

describe("percentOf", () => {
  it("rounds down so 100% means everything is done", () => {
    expect(percentOf(7, 8)).toBe(87);
    expect(percentOf(199, 200)).toBe(99);
    expect(percentOf(8, 8)).toBe(100);
  });

  it("is 0 for an empty course and never exceeds 100", () => {
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(5, 4)).toBe(100);
  });
});

describe("computeCourseProgress", () => {
  it("reports zero for a new student and points at the first lesson", () => {
    const progress = computeCourseProgress(course, emptyRecord(), { now: NOW });
    expect(progress.percent).toBe(0);
    expect(progress.totalItems).toBe(8);
    expect(progress.nextStep).toMatchObject({ kind: "lesson", href: "/learn/lessons/m1-l1" });
    expect(progress.currentModule?.module.id).toBe("m1");
    expect(progress.moduleProgress.map((m) => m.state)).toEqual(["available", "locked"]);
  });

  it("counts lessons, passed quizzes and submitted projects with equal weight", () => {
    const progress = computeCourseProgress(
      course,
      record({
        lessons: ["m1-l1", "m1-l2"],
        quizzes: { "m1-q": { bestPercent: 80, passed: true } },
        projects: { "m1-p": "submitted" },
      }),
      { now: NOW },
    );
    expect(progress.doneItems).toBe(4);
    expect(progress.percent).toBe(50);
    expect(progress.lessons).toEqual({ done: 2, total: 4 });
    expect(progress.modules).toEqual({ done: 1, total: 2 });
    expect(progress.moduleProgress[0]).toMatchObject({ state: "completed", percent: 100 });
  });

  it("does not count a failed quiz or a draft project", () => {
    const progress = computeCourseProgress(
      course,
      record({
        quizzes: { "m1-q": { bestPercent: 40, passed: false, attempts: 3 } },
        projects: { "m1-p": "in_progress" },
      }),
      { now: NOW },
    );
    expect(progress.doneItems).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.quizzes).toMatchObject({ passed: 0, attempted: 1, averageBestPercent: 40 });
    expect(progress.projects.submitted).toBe(0);
    // The module has been touched, so it is in progress rather than untouched.
    expect(progress.moduleProgress[0]?.state).toBe("in_progress");
  });

  it("counts a reviewed project as done", () => {
    const progress = computeCourseProgress(course, record({ projects: { "m1-p": "reviewed" } }), { now: NOW });
    expect(progress.projects.submitted).toBe(1);
  });

  it("ignores progress on items that are not in the outline", () => {
    const progress = computeCourseProgress(
      course,
      record({ lessons: ["deleted-lesson"], quizzes: { gone: { bestPercent: 100, passed: true } } }),
      { now: NOW },
    );
    expect(progress.doneItems).toBe(0);
    expect(progress.quizzes.attempted).toBe(0);
  });

  it("reaches 100% only when every item is done", () => {
    const everything = record({
      lessons: ["m1-l1", "m1-l2", "m2-l1", "m2-l2"],
      quizzes: { "m1-q": { bestPercent: 100, passed: true }, "m2-q": { bestPercent: 70, passed: true } },
      projects: { "m1-p": "reviewed", "m2-p": "submitted" },
    });
    const done = computeCourseProgress(course, everything, { now: NOW });
    expect(done.percent).toBe(100);
    expect(done.nextStep).toBeNull();
    expect(done.currentModule).toBeNull();

    const almost = computeCourseProgress(
      course,
      { ...everything, projectStatuses: new Map([["m1-p", "reviewed"]]) },
      { now: NOW },
    );
    expect(almost.percent).toBe(87);
  });
});

describe("module unlocking", () => {
  it("unlocks the next module once the previous module's lessons are complete", () => {
    const locked = computeCourseProgress(course, record({ lessons: ["m1-l1"] }), { now: NOW });
    expect(locked.moduleProgress[1]).toMatchObject({ state: "locked" });
    expect(locked.moduleProgress[1]?.lockReason).toContain("Module 1");

    const open = computeCourseProgress(course, record({ lessons: ["m1-l1", "m1-l2"] }), { now: NOW });
    expect(open.moduleProgress[1]?.state).toBe("available");
  });

  it("does not let an unfinished quiz or project block the next module", () => {
    const progress = computeCourseProgress(course, record({ lessons: ["m1-l1", "m1-l2"] }), { now: NOW });
    expect(progress.moduleProgress[1]?.state).toBe("available");
    expect(progress.nextStep?.href).toBe("/learn/lessons/m2-l1");
  });

  it("keeps a module locked until its opening date", () => {
    const dated = [course[0]!, makeModule(2, { availableFrom: "2026-10-20T00:00:00Z" })];
    const done = record({ lessons: ["m1-l1", "m1-l2"] });
    expect(computeCourseProgress(dated, done, { now: NOW }).moduleProgress[1]?.state).toBe("locked");
    expect(
      computeCourseProgress(dated, done, { now: new Date("2026-10-21T00:00:00Z") }).moduleProgress[1]?.state,
    ).toBe("available");
  });

  it("honours requiresPrevious = false", () => {
    const free = [course[0]!, makeModule(2, { requiresPrevious: false })];
    expect(computeCourseProgress(free, emptyRecord(), { now: NOW }).moduleProgress[1]?.state).toBe("available");
  });

  it("lets staff preview everything", () => {
    const progress = computeCourseProgress(course, emptyRecord(), { now: NOW, ignoreLocks: true });
    expect(progress.moduleProgress.every((m) => m.state !== "locked")).toBe(true);
  });

  it("sorts modules by position regardless of input order", () => {
    const progress = computeCourseProgress([...course].reverse(), emptyRecord(), { now: NOW });
    expect(progress.moduleProgress.map((m) => m.module.position)).toEqual([1, 2]);
  });
});

describe("next step", () => {
  it("prefers lessons, then the quiz, then the project", () => {
    const lessonsDone = record({ lessons: ["m1-l1", "m1-l2", "m2-l1", "m2-l2"] });
    expect(computeCourseProgress(course, lessonsDone, { now: NOW }).nextStep).toMatchObject({
      kind: "quiz",
      href: "/learn/quizzes/m1-q",
    });

    const quizzesDone: StudentRecord = {
      ...lessonsDone,
      quizStandings: new Map([
        ["m1-q", { attempts: 1, bestPercent: 90, passed: true }],
        ["m2-q", { attempts: 1, bestPercent: 90, passed: true }],
      ]),
    };
    expect(computeCourseProgress(course, quizzesDone, { now: NOW }).nextStep).toMatchObject({
      kind: "project",
      href: "/learn/projects/m1-p",
    });
  });

  it("never points into a locked module", () => {
    const progress = computeCourseProgress(course, record({ lessons: ["m1-l1"] }), { now: NOW });
    expect(progress.nextStep?.href).toBe("/learn/lessons/m1-l2");
  });
});

describe("lessonNeighbours", () => {
  it("walks across module boundaries and skips locked modules", () => {
    const open = computeCourseProgress(course, record({ lessons: ["m1-l1", "m1-l2"] }), { now: NOW });
    expect(lessonNeighbours(open.moduleProgress, "m1-l2").next?.id).toBe("m2-l1");
    expect(lessonNeighbours(open.moduleProgress, "m2-l1").previous?.id).toBe("m1-l2");
    expect(lessonNeighbours(open.moduleProgress, "m1-l1").previous).toBeNull();

    const locked = computeCourseProgress(course, emptyRecord(), { now: NOW });
    expect(lessonNeighbours(locked.moduleProgress, "m1-l2").next).toBeNull();
    expect(lessonNeighbours(locked.moduleProgress, "unknown")).toEqual({ previous: null, next: null });
  });
});

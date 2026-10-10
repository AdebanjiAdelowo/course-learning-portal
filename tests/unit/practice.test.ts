import { describe, expect, it } from "vitest";

import {
  checkCode,
  filterProblems,
  normaliseCode,
  PRACTICE_LIMITS,
  PRACTICE_NOTICE,
  practiceLimitMessage,
  practiceStanding,
  practiceStatusLabels,
  type FilterableProblem,
  type PracticeRow,
} from "@/lib/domain/practice";

const row = (status: PracticeRow["status"], verdict: PracticeRow["verdict"] = "not_evaluated"): PracticeRow => ({ status, verdict });

describe("practiceStanding", () => {
  it("is 'not attempted' with no rows", () => {
    expect(practiceStanding([])).toEqual({ status: "not_attempted", attempts: 0 });
  });

  it("is 'draft' when only a draft exists, and a draft is not an attempt", () => {
    expect(practiceStanding([row("draft")])).toEqual({ status: "draft", attempts: 0 });
  });

  it("is 'submitted' once an attempt is recorded, and counts only submitted rows", () => {
    expect(practiceStanding([row("draft"), row("submitted"), row("submitted")])).toEqual({ status: "submitted", attempts: 2 });
  });

  it("never reports 'verified' for an ungraded attempt, however many there are", () => {
    const rows = Array.from({ length: 10 }, () => row("submitted"));
    expect(practiceStanding(rows).status).toBe("submitted");
    expect(practiceStanding([row("submitted", "failed"), row("submitted", "error")]).status).toBe("submitted");
  });

  it("reports 'verified' only when a submitted attempt carries a passing verdict", () => {
    expect(practiceStanding([row("submitted", "failed"), row("submitted", "passed")]).status).toBe("verified");
    // A verdict on a draft means nothing: drafts are not graded.
    expect(practiceStanding([row("draft", "passed")]).status).toBe("draft");
  });

  it("does not use words that claim correctness for a self-reviewed submission", () => {
    expect(practiceStatusLabels.submitted).toBe("Submitted for self-review");
    expect(practiceStatusLabels.submitted).not.toMatch(/accepted|correct|passed|solved/i);
    expect(PRACTICE_NOTICE).toBe(
      "Solutions are saved for practice and review. Automated code execution and grading are not yet available.",
    );
  });
});

describe("normaliseCode", () => {
  it("unifies line endings and strips trailing whitespace", () => {
    expect(normaliseCode("a = 1  \r\nb = 2\t\r\n\r\n\r\n")).toBe("a = 1\nb = 2\n");
    expect(normaliseCode("x\ry")).toBe("x\ny");
  });

  it("keeps indentation and blank lines inside the code", () => {
    const code = "def f():\n    if True:\n\n        return 1\n";
    expect(normaliseCode(code)).toBe(code);
  });

  it("is idempotent", () => {
    const once = normaliseCode("def f():  \r\n\treturn 1   \n\n");
    expect(normaliseCode(once)).toBe(once);
  });
});

describe("checkCode", () => {
  const starter = "def f(x):\n    return 0\n";

  it("accepts ordinary code and returns it normalised", () => {
    expect(checkCode("def f(x):\r\n    return x  \r\n", { intent: "submit", starter })).toEqual({ ok: true, code: "def f(x):\n    return x\n" });
  });

  it("rejects empty and whitespace-only code", () => {
    for (const code of ["", "   ", "\n\n\t\n"]) {
      expect(checkCode(code, { intent: "save" }).ok).toBe(false);
    }
  });

  it("enforces the size limit on the normalised code, at the boundary", () => {
    const atLimit = "x".repeat(PRACTICE_LIMITS.maxCodeLength);
    expect(checkCode(atLimit, { intent: "save" }).ok).toBe(true);
    expect(checkCode(`${atLimit}y`, { intent: "save" }).ok).toBe(false);
    // Trailing spaces and extra blank lines are not stored, so they do not count. The single
    // final newline is stored, and does.
    const oneShort = "x".repeat(PRACTICE_LIMITS.maxCodeLength - 1);
    expect(checkCode(`${oneShort}    \n\n\n`, { intent: "save" })).toEqual({ ok: true, code: `${oneShort}\n` });
    expect(checkCode(`${atLimit}    \n\n`, { intent: "save" }).ok).toBe(false);
  });

  it("rejects a NUL character, which Postgres text cannot store", () => {
    expect(checkCode("a = 1\u0000", { intent: "save" }).ok).toBe(false);
  });

  it("lets the starter code be saved as a draft but not submitted as an attempt", () => {
    expect(checkCode(starter, { intent: "save", starter }).ok).toBe(true);
    expect(checkCode(starter, { intent: "submit", starter }).ok).toBe(false);
    expect(checkCode(`${starter.trimEnd()}   \r\n`, { intent: "submit", starter }).ok).toBe(false);
  });

  it("treats any change to the starter code as an attempt", () => {
    expect(checkCode(starter.replace("return 0", "return x"), { intent: "submit", starter }).ok).toBe(true);
  });
});

describe("filterProblems", () => {
  const problems: FilterableProblem[] = [
    { title: "First occurrence", summary: "Smallest index of a value", moduleTitle: "Correctness and cost", difficulty: "warm_up", status: "submitted" },
    { title: "Lower bound", summary: "First position at least the target", moduleTitle: "Correctness and cost", difficulty: "core", status: "draft" },
    { title: "Integer square root", summary: "Square root rounded down", moduleTitle: "Correctness and cost", difficulty: "challenge", status: "not_attempted" },
  ];
  const all = { query: "", difficulty: "all", status: "all" } as const;

  it("returns everything with no filter, in the given order", () => {
    expect(filterProblems(problems, all)).toEqual(problems);
  });

  it("filters by difficulty and by status", () => {
    expect(filterProblems(problems, { ...all, difficulty: "core" }).map((p) => p.title)).toEqual(["Lower bound"]);
    expect(filterProblems(problems, { ...all, status: "not_attempted" }).map((p) => p.title)).toEqual(["Integer square root"]);
    expect(filterProblems(problems, { ...all, difficulty: "core", status: "submitted" })).toEqual([]);
  });

  it("searches title, summary and module title, case-insensitively, requiring every word", () => {
    expect(filterProblems(problems, { ...all, query: "SQUARE root" }).map((p) => p.title)).toEqual(["Integer square root"]);
    expect(filterProblems(problems, { ...all, query: "index" }).map((p) => p.title)).toEqual(["First occurrence"]);
    expect(filterProblems(problems, { ...all, query: "cost" })).toHaveLength(3);
    expect(filterProblems(problems, { ...all, query: "square bound" })).toEqual([]);
  });
});

describe("practiceLimitMessage", () => {
  it("explains each refusal raised by the database trigger", () => {
    expect(practiceLimitMessage("practice_duplicate")).toMatch(/identical/);
    expect(practiceLimitMessage("practice_limit_hour")).toContain(String(PRACTICE_LIMITS.maxSubmissionsPerHour));
    expect(practiceLimitMessage("practice_limit_problem")).toContain(String(PRACTICE_LIMITS.maxSubmissionsPerProblem));
  });

  it("returns null for anything else, so the caller shows a generic message", () => {
    expect(practiceLimitMessage(undefined)).toBeNull();
    expect(practiceLimitMessage("new row violates row-level security policy")).toBeNull();
  });
});

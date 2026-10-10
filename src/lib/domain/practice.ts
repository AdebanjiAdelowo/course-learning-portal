/**
 * Coding practice: status rules and limits. Pure functions.
 *
 * Nothing in this application runs a student's code. A submitted attempt is a saved record for
 * the student's own review, so it is never described as correct, accepted or passed. The
 * "verified" status exists for a future trusted grading service and is reached only when that
 * service has recorded a passing verdict.
 */

export type ProblemDifficulty = "warm_up" | "core" | "challenge";
export type CodeSubmissionStatus = "draft" | "submitted";
export type CodeVerdict = "not_evaluated" | "passed" | "failed" | "error";

export type PracticeStatus = "not_attempted" | "draft" | "submitted" | "verified";

export interface PracticeRow {
  status: CodeSubmissionStatus;
  verdict: CodeVerdict;
}

/** Limits enforced by the server action and, independently, by a database trigger. */
export const PRACTICE_LIMITS = {
  maxCodeLength: 20_000,
  maxSubmissionsPerProblem: 30,
  maxSubmissionsPerHour: 20,
} as const;

export const PRACTICE_NOTICE =
  "Solutions are saved for practice and review. Automated code execution and grading are not yet available.";

export interface PracticeStanding {
  status: PracticeStatus;
  /** Number of submitted attempts (drafts are not attempts). */
  attempts: number;
}

/**
 * Status of one problem from all of a student's rows for it.
 * verified > submitted > draft > not attempted.
 */
export function practiceStanding(rows: readonly PracticeRow[]): PracticeStanding {
  const submitted = rows.filter((row) => row.status === "submitted");
  const status: PracticeStatus = submitted.some((row) => row.verdict === "passed")
    ? "verified"
    : submitted.length > 0
      ? "submitted"
      : rows.some((row) => row.status === "draft")
        ? "draft"
        : "not_attempted";
  return { status, attempts: submitted.length };
}

export const practiceStatusLabels: Record<PracticeStatus, string> = {
  not_attempted: "Not attempted",
  draft: "Draft saved",
  submitted: "Submitted for self-review",
  verified: "Automatically verified",
};

export const difficultyLabels: Record<ProblemDifficulty, string> = {
  warm_up: "Warm-up",
  core: "Core",
  challenge: "Challenge",
};

export const difficultyOrder: Record<ProblemDifficulty, number> = { warm_up: 0, core: 1, challenge: 2 };

/** Line endings are normalised and trailing whitespace dropped, so equal code compares equal. */
export function normaliseCode(code: string): string {
  return code
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "\n");
}

export type CodeCheck = { ok: true; code: string } | { ok: false; error: string };

/** Validates code before it is stored. `starter` is the unmodified starter code, if known. */
export function checkCode(raw: string, options: { intent: "save" | "submit"; starter?: string }): CodeCheck {
  const code = normaliseCode(raw);
  if (code.trim() === "") return { ok: false, error: "Write some code first." };
  if (code.length > PRACTICE_LIMITS.maxCodeLength) {
    return { ok: false, error: `Keep your solution under ${PRACTICE_LIMITS.maxCodeLength.toLocaleString("en-GB")} characters.` };
  }
  if (code.includes("\u0000")) return { ok: false, error: "Your code contains a character that cannot be stored." };
  if (options.intent === "submit" && options.starter !== undefined && code.trim() === normaliseCode(options.starter).trim()) {
    return { ok: false, error: "This is still the starter code. Write your solution before submitting." };
  }
  return { ok: true, code };
}

export interface PracticeFilter {
  query: string;
  difficulty: ProblemDifficulty | "all";
  status: PracticeStatus | "all";
}

export interface FilterableProblem {
  title: string;
  summary: string;
  moduleTitle: string;
  difficulty: ProblemDifficulty;
  status: PracticeStatus;
}

export function filterProblems<T extends FilterableProblem>(problems: readonly T[], filter: PracticeFilter): T[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return problems.filter((problem) => {
    if (filter.difficulty !== "all" && problem.difficulty !== filter.difficulty) return false;
    if (filter.status !== "all" && problem.status !== filter.status) return false;
    const haystack = `${problem.title} ${problem.summary} ${problem.moduleTitle}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** Maps the database trigger's refusal codes to messages a student can act on. */
export function practiceLimitMessage(databaseMessage: string | undefined): string | null {
  if (!databaseMessage) return null;
  if (databaseMessage.includes("practice_duplicate")) {
    return "This is identical to your last submitted attempt, so it was not recorded again.";
  }
  if (databaseMessage.includes("practice_limit_hour")) {
    return `You have submitted ${PRACTICE_LIMITS.maxSubmissionsPerHour} attempts in the last hour. Take a break and try again later; your draft is saved.`;
  }
  if (databaseMessage.includes("practice_limit_problem")) {
    return `You have reached the limit of ${PRACTICE_LIMITS.maxSubmissionsPerProblem} recorded attempts for this problem. You can still save drafts.`;
  }
  return null;
}

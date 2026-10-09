/**
 * Parsing for the instructor area's quiz and project editors. Pure functions: the text an
 * instructor types goes in, and either a validated structure or a readable error comes out.
 *
 * Question options are written one per line, with a leading asterisk on each correct one:
 *
 *     Gradient descent always converges
 *     * Parameters exist that approximate the target
 *     A fixed width is always enough
 *
 * Rubrics are written one criterion per line, as "Criterion | what you look for | points".
 */
import type { QuestionType, QuizOption } from "./quiz";

const OPTION_IDS = "abcdefghijklmnopqrstuvwxyz";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface QuestionDraft {
  type: QuestionType;
  /** Multiple choice and multiple select: one option per line, correct ones starred. */
  optionsText: string;
  /** True/false: "true" or "false". */
  trueFalse: string;
  /** Short answer: accepted answers, one per line. */
  acceptedText: string;
}

export interface QuestionPayload {
  options: QuizOption[];
  correct: string | string[] | boolean;
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseQuestion(draft: QuestionDraft): Parsed<QuestionPayload> {
  if (draft.type === "true_false") {
    if (draft.trueFalse !== "true" && draft.trueFalse !== "false") {
      return { ok: false, error: "Choose whether the statement is true or false." };
    }
    return { ok: true, value: { options: [], correct: draft.trueFalse === "true" } };
  }

  if (draft.type === "short_answer") {
    const accepted = [...new Set(lines(draft.acceptedText))];
    if (accepted.length === 0) return { ok: false, error: "Add at least one accepted answer." };
    if (accepted.some((answer) => answer.length > 200)) {
      return { ok: false, error: "Keep each accepted answer under 200 characters." };
    }
    return { ok: true, value: { options: [], correct: accepted } };
  }

  const rows = lines(draft.optionsText).map((line) => {
    const starred = line.startsWith("*");
    return { starred, text: (starred ? line.slice(1) : line).trim() };
  });
  if (rows.some((row) => row.text === "")) return { ok: false, error: "An option is empty. Write some text after the asterisk." };
  if (rows.length < 2) return { ok: false, error: "Add at least two options, one per line." };
  if (rows.length > OPTION_IDS.length) return { ok: false, error: `Use at most ${OPTION_IDS.length} options.` };
  if (new Set(rows.map((row) => row.text)).size !== rows.length) return { ok: false, error: "Two options have the same text." };

  const options = rows.map((row, index) => ({ id: OPTION_IDS[index]!, text: row.text }));
  const correctIds = rows.flatMap((row, index) => (row.starred ? [OPTION_IDS[index]!] : []));

  if (draft.type === "multiple_choice") {
    if (correctIds.length !== 1) {
      return { ok: false, error: "Mark exactly one option as correct by starting its line with an asterisk (*)." };
    }
    return { ok: true, value: { options, correct: correctIds[0]! } };
  }

  if (correctIds.length === 0) {
    return { ok: false, error: "Mark every correct option by starting its line with an asterisk (*)." };
  }
  return { ok: true, value: { options, correct: correctIds } };
}

/** The inverse of `parseQuestion`, used to fill the editor from a stored question. */
export function questionToDraft(type: QuestionType, options: readonly QuizOption[], correct: unknown): QuestionDraft {
  const correctIds = Array.isArray(correct) ? correct.filter((v): v is string => typeof v === "string") : typeof correct === "string" ? [correct] : [];
  const choice = type === "multiple_choice" || type === "multiple_select";
  return {
    type,
    optionsText: choice ? options.map((option) => `${correctIds.includes(option.id) ? "* " : ""}${option.text}`).join("\n") : "",
    trueFalse: type === "true_false" ? String(correct === true) : "true",
    acceptedText: type === "short_answer" ? correctIds.join("\n") : "",
  };
}

export interface RubricRow {
  criterion: string;
  description: string;
  points: number;
}

export function parseRubric(text: string): Parsed<RubricRow[]> {
  const rows: RubricRow[] = [];
  for (const [index, line] of lines(text).entries()) {
    const parts = line.split("|").map((part) => part.trim());
    const where = `Rubric line ${index + 1}`;
    if (parts.length !== 3) return { ok: false, error: `${where}: write it as "Criterion | what you look for | points".` };
    const [criterion, description, rawPoints] = parts as [string, string, string];
    if (!criterion) return { ok: false, error: `${where}: the criterion name is missing.` };
    if (!/^\d+$/.test(rawPoints) || Number(rawPoints) <= 0) return { ok: false, error: `${where}: points must be a whole number greater than zero.` };
    if (rows.some((row) => row.criterion.toLowerCase() === criterion.toLowerCase())) {
      return { ok: false, error: `${where}: "${criterion}" appears twice.` };
    }
    rows.push({ criterion, description, points: Number(rawPoints) });
  }
  if (rows.length === 0) return { ok: false, error: "Add at least one rubric line, so students know how the work is graded." };
  if (rows.length > 20) return { ok: false, error: "Use at most 20 rubric lines." };
  return { ok: true, value: rows };
}

export function rubricToText(rubric: readonly RubricRow[]): string {
  return rubric.map((row) => `${row.criterion} | ${row.description} | ${row.points}`).join("\n");
}

export function rubricTotal(rubric: readonly RubricRow[]): number {
  return rubric.reduce((sum, row) => sum + row.points, 0);
}

/** "A Verified 1D Heat Solver!" -> "a-verified-1d-heat-solver" */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export type AttachmentKind = "course" | "module" | "lesson" | "project" | "session";

/** Resources are attached with a single select whose values look like "lesson:<uuid>". */
export function parseAttachment(value: string): Parsed<{ kind: AttachmentKind; id: string | null }> {
  if (value === "course") return { ok: true, value: { kind: "course", id: null } };
  const match = /^(module|lesson|project|session):([0-9a-f-]{36})$/i.exec(value);
  if (!match) return { ok: false, error: "Choose where the resource belongs." };
  return { ok: true, value: { kind: match[1] as AttachmentKind, id: match[2]! } };
}

/**
 * Quiz grading. Pure and deterministic; the server action in `src/app/learn/actions/quiz.ts`
 * loads the answer keys with the service role and calls `gradeQuiz`.
 *
 * Rules:
 *   - multiple_choice / true_false: full marks for the right answer, otherwise zero.
 *   - multiple_select: all-or-nothing. The selected set must equal the correct set exactly.
 *   - short_answer: compared after trimming, lower-casing and collapsing whitespace; if both
 *     sides parse as numbers they are compared numerically ("0.50" matches "0.5").
 *   - percent = round(100 * score / max score, 2 d.p.); passed when percent >= pass mark.
 */

export type QuestionType = "multiple_choice" | "multiple_select" | "true_false" | "short_answer";

export interface QuizOption {
  id: string;
  text: string;
}

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
}

export interface AnswerKey {
  correct: unknown;
  explanation: string;
}

/** What the client sends for one question. */
export type AnswerValue = string | string[] | boolean | null;

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  earned: number;
  points: number;
  given: AnswerValue;
  correctAnswer: AnswerValue;
  explanation: string;
}

export interface QuizGrade {
  results: QuestionResult[];
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
}

export function normaliseText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameText(a: string, b: string): boolean {
  const left = normaliseText(a);
  const right = normaliseText(b);
  if (left === right) return true;
  if (left === "" || right === "") return false;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function isCorrect(type: QuestionType, given: AnswerValue | undefined, correct: unknown): boolean {
  if (!isAnswered(given)) return false;
  switch (type) {
    case "multiple_choice":
      return typeof given === "string" && typeof correct === "string" && given === correct;
    case "true_false":
      return typeof given === "boolean" && typeof correct === "boolean" && given === correct;
    case "multiple_select": {
      const selected = new Set(asStringArray(given));
      const expected = new Set(asStringArray(correct));
      return selected.size === expected.size && [...expected].every((id) => selected.has(id));
    }
    case "short_answer":
      return (
        typeof given === "string" && asStringArray(correct).some((accepted) => sameText(given, accepted))
      );
  }
}

/** The key as it is shown back to the student after submission. */
function presentableKey(type: QuestionType, correct: unknown): AnswerValue {
  if (type === "true_false") return typeof correct === "boolean" ? correct : null;
  if (type === "multiple_choice") return typeof correct === "string" ? correct : null;
  return asStringArray(correct);
}

export function gradeQuiz(
  questions: readonly GradableQuestion[],
  keys: ReadonlyMap<string, AnswerKey>,
  answers: Readonly<Record<string, AnswerValue>>,
  passPercent: number,
): QuizGrade {
  if (questions.length === 0) throw new Error("A quiz needs at least one question.");

  const results = questions.map((question): QuestionResult => {
    const key = keys.get(question.id);
    if (!key) throw new Error(`Question ${question.id} has no answer key.`);
    const given = answers[question.id] ?? null;
    const correct = isCorrect(question.type, given, key.correct);
    return {
      questionId: question.id,
      correct,
      earned: correct ? question.points : 0,
      points: question.points,
      given,
      correctAnswer: presentableKey(question.type, key.correct),
      explanation: key.explanation,
    };
  });

  const score = results.reduce((sum, r) => sum + r.earned, 0);
  const maxScore = results.reduce((sum, r) => sum + r.points, 0);
  const percent = Math.round((10000 * score) / maxScore) / 100;

  return { results, score, maxScore, percent, passed: percent >= passPercent };
}

export interface AttemptSummary {
  percent: number;
  passed: boolean;
}

/** Best attempt per quiz: the highest percentage; `passed` if any attempt passed. */
export function summariseAttempts(attempts: readonly AttemptSummary[]) {
  if (attempts.length === 0) return null;
  return {
    attempts: attempts.length,
    bestPercent: Math.max(...attempts.map((a) => a.percent)),
    passed: attempts.some((a) => a.passed),
  };
}

/** One graded question as stored in `quiz_attempts.results` and shown on the review page. */
export interface StoredResult extends QuestionResult {
  type: QuestionType;
  prompt: string;
  options: QuizOption[];
}

export interface SnapshotQuestion extends GradableQuestion {
  prompt: string;
  options: QuizOption[];
}

/**
 * Combines a grade with the question text, so a stored attempt stays readable even if the
 * quiz is edited afterwards.
 */
export function toStoredResults(grade: QuizGrade, questions: readonly SnapshotQuestion[]): StoredResult[] {
  return grade.results.map((result) => {
    const question = questions.find((q) => q.id === result.questionId);
    if (!question) throw new Error(`Question ${result.questionId} is missing from the snapshot.`);
    return { ...result, type: question.type, prompt: question.prompt, options: question.options };
  });
}

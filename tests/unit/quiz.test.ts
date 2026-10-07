import { describe, expect, it } from "vitest";

import {
  gradeQuiz,
  isAnswered,
  isCorrect,
  normaliseText,
  summariseAttempts,
  toStoredResults,
  type AnswerKey,
  type SnapshotQuestion,
} from "@/lib/domain/quiz";

const questions: SnapshotQuestion[] = [
  { id: "mc", type: "multiple_choice", points: 1, prompt: "Pick one", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
  { id: "ms", type: "multiple_select", points: 2, prompt: "Pick many", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }] },
  { id: "tf", type: "true_false", points: 1, prompt: "True?", options: [] },
  { id: "sa", type: "short_answer", points: 1, prompt: "Type", options: [] },
];

const keys = new Map<string, AnswerKey>([
  ["mc", { correct: "b", explanation: "B is right." }],
  ["ms", { correct: ["a", "c"], explanation: "A and C." }],
  ["tf", { correct: false, explanation: "It is false." }],
  ["sa", { correct: ["0.5", "1/2"], explanation: "One half." }],
]);

const perfect = { mc: "b", ms: ["c", "a"], tf: false, sa: " 0.50 " };

describe("isCorrect", () => {
  it("grades multiple choice by option id", () => {
    expect(isCorrect("multiple_choice", "b", "b")).toBe(true);
    expect(isCorrect("multiple_choice", "a", "b")).toBe(false);
  });

  it("requires an exact set for multiple select, in any order", () => {
    expect(isCorrect("multiple_select", ["c", "a"], ["a", "c"])).toBe(true);
    expect(isCorrect("multiple_select", ["a"], ["a", "c"])).toBe(false);
    expect(isCorrect("multiple_select", ["a", "b", "c"], ["a", "c"])).toBe(false);
    expect(isCorrect("multiple_select", ["a", "a"], ["a", "c"])).toBe(false);
  });

  it("treats false as a real answer for true/false questions", () => {
    expect(isCorrect("true_false", false, false)).toBe(true);
    expect(isCorrect("true_false", true, false)).toBe(false);
    expect(isCorrect("true_false", "false", false)).toBe(false);
  });

  it("compares short answers without regard to case, spacing or number format", () => {
    expect(isCorrect("short_answer", "  Manufactured   Solutions ", ["manufactured solutions"])).toBe(true);
    expect(isCorrect("short_answer", "0.50", ["0.5"])).toBe(true);
    expect(isCorrect("short_answer", ".5", ["0.5"])).toBe(true);
    expect(isCorrect("short_answer", "1/2", ["0.5", "1/2"])).toBe(true);
    expect(isCorrect("short_answer", "0.51", ["0.5"])).toBe(false);
    expect(isCorrect("short_answer", "", ["0"])).toBe(false);
  });

  it("marks missing or wrongly typed answers as incorrect", () => {
    expect(isCorrect("multiple_choice", null, "a")).toBe(false);
    expect(isCorrect("multiple_choice", undefined, "a")).toBe(false);
    expect(isCorrect("multiple_choice", ["a"], "a")).toBe(false);
    expect(isCorrect("multiple_select", [], [])).toBe(false);
  });
});

describe("gradeQuiz", () => {
  it("awards full marks for a perfect paper", () => {
    const grade = gradeQuiz(questions, keys, perfect, 70);
    expect(grade).toMatchObject({ score: 5, maxScore: 5, percent: 100, passed: true });
    expect(grade.results.every((r) => r.correct)).toBe(true);
  });

  it("weights questions by their points", () => {
    const grade = gradeQuiz(questions, keys, { ...perfect, ms: ["a"] }, 70);
    expect(grade.score).toBe(3);
    expect(grade.percent).toBe(60);
    expect(grade.passed).toBe(false);
  });

  it("passes exactly at the threshold", () => {
    expect(gradeQuiz(questions, keys, { ...perfect, mc: "a" }, 80).passed).toBe(true);
    expect(gradeQuiz(questions, keys, { ...perfect, mc: "a" }, 81).passed).toBe(false);
  });

  it("scores unanswered questions as zero", () => {
    const grade = gradeQuiz(questions, keys, {}, 70);
    expect(grade).toMatchObject({ score: 0, percent: 0, passed: false });
    expect(grade.results.map((r) => r.given)).toEqual([null, null, null, null]);
  });

  it("ignores answers to questions that are not in the quiz", () => {
    expect(gradeQuiz(questions, keys, { ...perfect, injected: "x" }, 70).score).toBe(5);
  });

  it("rounds the percentage to two decimals", () => {
    const three = questions.filter((q) => q.id !== "ms");
    expect(gradeQuiz(three, keys, { mc: "b" }, 70).percent).toBe(33.33);
  });

  it("returns the key and explanation for the review page", () => {
    const grade = gradeQuiz(questions, keys, { mc: "a" }, 70);
    expect(grade.results[0]).toMatchObject({ correct: false, given: "a", correctAnswer: "b", explanation: "B is right." });
    expect(grade.results[2]?.correctAnswer).toBe(false);
  });

  it("refuses to grade a quiz with a missing key or no questions", () => {
    expect(() => gradeQuiz(questions, new Map(), perfect, 70)).toThrow(/no answer key/);
    expect(() => gradeQuiz([], keys, perfect, 70)).toThrow(/at least one question/);
  });
});

describe("toStoredResults", () => {
  it("attaches prompts and options so an attempt stays readable after edits", () => {
    const stored = toStoredResults(gradeQuiz(questions, keys, perfect, 70), questions);
    expect(stored[1]).toMatchObject({ questionId: "ms", type: "multiple_select", prompt: "Pick many" });
    expect(stored[1]?.options).toHaveLength(3);
  });
});

describe("helpers", () => {
  it("summarises attempts by best score", () => {
    expect(summariseAttempts([])).toBeNull();
    expect(
      summariseAttempts([
        { percent: 40, passed: false },
        { percent: 85, passed: true },
        { percent: 60, passed: false },
      ]),
    ).toEqual({ attempts: 3, bestPercent: 85, passed: true });
  });

  it("knows what counts as answered", () => {
    expect(isAnswered(false)).toBe(true);
    expect(isAnswered("  ")).toBe(false);
    expect(isAnswered([])).toBe(false);
    expect(isAnswered(null)).toBe(false);
  });

  it("normalises text", () => {
    expect(normaliseText("  Hello   World ")).toBe("hello world");
  });
});

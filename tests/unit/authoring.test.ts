import { describe, expect, it } from "vitest";

import {
  parseAttachment,
  parseQuestion,
  parseRubric,
  questionToDraft,
  rubricToText,
  rubricTotal,
  slugify,
  type QuestionDraft,
} from "@/lib/domain/authoring";
import { isCorrect } from "@/lib/domain/quiz";

const draft = (overrides: Partial<QuestionDraft>): QuestionDraft => ({
  type: "multiple_choice",
  optionsText: "",
  trueFalse: "true",
  acceptedText: "",
  ...overrides,
});

function value<T>(parsed: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function error(parsed: { ok: boolean; error?: string }): string {
  expect(parsed.ok).toBe(false);
  return parsed.error ?? "";
}

describe("parseQuestion", () => {
  it("reads starred lines as the correct options and assigns ids in order", () => {
    const parsed = value(parseQuestion(draft({ optionsText: "First\n*  Second \n\nThird" })));
    expect(parsed.options).toEqual([
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
      { id: "c", text: "Third" },
    ]);
    expect(parsed.correct).toBe("b");
  });

  it("requires exactly one correct option for multiple choice", () => {
    expect(error(parseQuestion(draft({ optionsText: "A\nB" })))).toMatch(/exactly one/);
    expect(error(parseQuestion(draft({ optionsText: "*A\n*B" })))).toMatch(/exactly one/);
  });

  it("accepts several correct options for multiple select, and needs at least one", () => {
    const parsed = value(parseQuestion(draft({ type: "multiple_select", optionsText: "*A\nB\n*C" })));
    expect(parsed.correct).toEqual(["a", "c"]);
    expect(error(parseQuestion(draft({ type: "multiple_select", optionsText: "A\nB" })))).toMatch(/every correct option/);
  });

  it("rejects too few, empty or duplicate options", () => {
    expect(error(parseQuestion(draft({ optionsText: "*Only one" })))).toMatch(/at least two/);
    expect(error(parseQuestion(draft({ optionsText: "*\nB" })))).toMatch(/empty/);
    expect(error(parseQuestion(draft({ optionsText: "*Same\nSame" })))).toMatch(/same text/);
  });

  it("keeps LaTeX and asterisks inside the option text", () => {
    const parsed = value(parseQuestion(draft({ optionsText: String.raw`* $\mathcal{O}(\Delta x^2)$` + "\n$a * b$" })));
    expect(parsed.options[0]?.text).toBe(String.raw`$\mathcal{O}(\Delta x^2)$`);
    expect(parsed.options[1]?.text).toBe("$a * b$");
    expect(parsed.correct).toBe("a");
  });

  it("handles true/false, where false is a valid key", () => {
    expect(value(parseQuestion(draft({ type: "true_false", trueFalse: "false" })))).toEqual({ options: [], correct: false });
    expect(value(parseQuestion(draft({ type: "true_false", trueFalse: "true" }))).correct).toBe(true);
    expect(error(parseQuestion(draft({ type: "true_false", trueFalse: "maybe" })))).toMatch(/true or false/);
  });

  it("collects accepted short answers without duplicates", () => {
    const parsed = value(parseQuestion(draft({ type: "short_answer", acceptedText: "0.5\n 1/2 \n0.5\n" })));
    expect(parsed.correct).toEqual(["0.5", "1/2"]);
    expect(error(parseQuestion(draft({ type: "short_answer", acceptedText: "  \n" })))).toMatch(/at least one/);
  });

  it("produces keys that the grader accepts", () => {
    const choice = value(parseQuestion(draft({ optionsText: "A\n*B" })));
    expect(isCorrect("multiple_choice", "b", choice.correct)).toBe(true);
    const select = value(parseQuestion(draft({ type: "multiple_select", optionsText: "*A\nB\n*C" })));
    expect(isCorrect("multiple_select", ["c", "a"], select.correct)).toBe(true);
    const short = value(parseQuestion(draft({ type: "short_answer", acceptedText: "0.5" })));
    expect(isCorrect("short_answer", "0.50", short.correct)).toBe(true);
    const tf = value(parseQuestion(draft({ type: "true_false", trueFalse: "false" })));
    expect(isCorrect("true_false", false, tf.correct)).toBe(true);
  });
});

describe("questionToDraft", () => {
  it("round-trips every question type", () => {
    const cases: QuestionDraft[] = [
      draft({ optionsText: "First\n* Second\nThird" }),
      draft({ type: "multiple_select", optionsText: "* First\nSecond\n* Third" }),
      draft({ type: "true_false", trueFalse: "false" }),
      draft({ type: "short_answer", acceptedText: "0.5\n1/2" }),
    ];
    for (const original of cases) {
      const parsed = value(parseQuestion(original));
      const back = questionToDraft(original.type, parsed.options, parsed.correct);
      expect(value(parseQuestion(back)), original.type).toEqual(parsed);
    }
  });
});

describe("parseRubric", () => {
  it("parses criteria and totals their points", () => {
    const rows = value(parseRubric("Correctness | The solver works. | 60\n\n Reporting|Clear figures|40 "));
    expect(rows).toEqual([
      { criterion: "Correctness", description: "The solver works.", points: 60 },
      { criterion: "Reporting", description: "Clear figures", points: 40 },
    ]);
    expect(rubricTotal(rows)).toBe(100);
    expect(value(parseRubric(rubricToText(rows)))).toEqual(rows);
  });

  it("explains which line is wrong", () => {
    expect(error(parseRubric("Correctness | 60"))).toMatch(/line 1.*Criterion \| what you look for \| points/);
    expect(error(parseRubric("A | ok | 10\nB | ok | ten"))).toMatch(/line 2.*whole number/);
    expect(error(parseRubric("A | ok | 0"))).toMatch(/greater than zero/);
    expect(error(parseRubric(" | ok | 5"))).toMatch(/criterion name is missing/);
    expect(error(parseRubric("A | x | 5\na | y | 5"))).toMatch(/appears twice/);
    expect(error(parseRubric("\n"))).toMatch(/at least one/);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("A Verified 1D Heat-Equation Solver!")).toBe("a-verified-1d-heat-equation-solver");
    expect(slugify("  Évaluation des modèles  ")).toBe("evaluation-des-modeles");
    expect(slugify("???")).toBe("");
    expect(slugify("x".repeat(200)).length).toBe(80);
  });
});

describe("parseAttachment", () => {
  const id = "3f2b8c1e-6c1d-4f6e-9a55-0d6f2f5b7a10";
  it("reads the attachment select value", () => {
    expect(value(parseAttachment("course"))).toEqual({ kind: "course", id: null });
    expect(value(parseAttachment(`lesson:${id}`))).toEqual({ kind: "lesson", id });
    expect(value(parseAttachment(`session:${id}`)).kind).toBe("session");
  });
  it("rejects anything else", () => {
    expect(parseAttachment("lesson:123").ok).toBe(false);
    expect(parseAttachment(`table:${id}`).ok).toBe(false);
    expect(parseAttachment("").ok).toBe(false);
  });
});

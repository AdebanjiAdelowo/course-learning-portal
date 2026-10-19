/** Browser checks shared by the draft-module suites: lessons, practice problems, quiz and project. */
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import type { draftModuleFixture } from "./draft-module";

type State = ReturnType<typeof draftModuleFixture>["state"];

export async function walkLessons(page: Page, state: State) {
  expect(state.lessons).toHaveLength(6);
  await page.goto(`/learn/modules/${state.prefix}`);
  for (const lesson of state.lessons) await expect(page.locator(`a[href="/learn/lessons/${lesson.slug}"]`).first()).toBeVisible();
  for (const [index, lesson] of state.lessons.entries()) {
    if (index === 0) await page.locator(`a[href="/learn/lessons/${lesson.slug}"]`).first().click();
    else await page.getByRole("link", { name: /Next lesson/ }).click();
    await expect(page).toHaveURL(new RegExp(`/learn/lessons/${lesson.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: lesson.title })).toBeVisible();
    const run = page.getByRole("button", { name: "Run code", exact: true }).first();
    await expect(run).toBeVisible();
    await run.click();
    await expect(page.locator('[data-run-state="completed"]').first()).toBeVisible({ timeout: 100_000 });
    await expect(page.locator('[data-run-state="failed"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Mark as complete", exact: true }).click();
    await expect(page.getByText("Lesson complete", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Lesson complete", { exact: true })).toBeVisible();
  }
}

export async function runAllProblems(page: Page, state: State) {
  expect(state.problems).toHaveLength(6);
  for (const problem of state.problems) {
    await page.goto(`/learn/practice/${problem.slug}`);
    await expect(page.getByText("Local sample-test results: not official grading.")).toBeVisible();
    await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toHaveCount(0);
    const code = readFileSync(`seed/problems/${problem.sourceSlug}/solution.py`, "utf8");
    await expect(async () => {
      await page.getByLabel("Python solution").fill(code);
      await expect(page.getByLabel("Python solution")).toHaveValue(code);
    }).toPass();
    await page.getByRole("button", { name: "Run code", exact: true }).click();
    await expect(page.locator('[data-run-state="completed"]')).toBeVisible({ timeout: 100_000 });
    await expect(page.locator('[data-test-status="passed"]')).toHaveCount(problem.samples);
    await expect(page.locator('[data-test-status="failed"]')).toHaveCount(0);
    // Running samples is local feedback only: nothing is recorded until a draft or submission.
    await expect(page.getByText("Not attempted", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draft saved. It has not been submitted." })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Python solution")).toHaveValue(code);
    await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Submit for self-review", exact: true }).click();
    await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toBeVisible();
    await page.getByText("Read the editorial and the reference solution", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Reference solution", exact: true })).toBeVisible();
    await expect(page.getByText(/^Unlocked because you have submitted an attempt\./)).toContainText("Submission does not mean the solution is correct");
    await expect(page.getByRole("region", { name: "Submission history" }).getByText("Attempt 1", { exact: true })).toBeVisible();
  }
}

export async function passQuizAndSubmitProject(page: Page, state: State, link: string) {
  await page.goto(`/learn/quizzes/${state.quizSlug}`);
  expect(state.questions).toHaveLength(10);
  for (const [index, q] of state.questions.entries()) {
    await expect(page.getByText(`Question ${index + 1} of 10`)).toBeVisible();
    const correct = state.keys.find((k) => k.question_id === q.id)!.correct;
    const options = q.options as { id: string; text: string }[];
    if (q.type === "multiple_choice") await page.getByRole("radio").nth(options.findIndex((o) => o.id === correct)).check();
    else if (q.type === "multiple_select") {
      for (const id of correct as string[]) await page.getByRole("checkbox").nth(options.findIndex((o) => o.id === id)).check();
    } else if (q.type === "true_false") await page.getByRole("radio", { name: correct ? "True" : "False", exact: true }).check();
    else await page.getByLabel("Your answer").fill((correct as string[])[0]!);
    await page.getByRole("button", { name: index === 9 ? "Review answers" : "Save answer and continue" }).click();
  }
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Passed", { exact: true })).toBeVisible();
  await page.goto(`/learn/projects/${state.projectSlug}`);
  await expect(page.getByRole("heading", { name: "Grading rubric" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "100", exact: true })).toBeVisible();
  await page.getByLabel("Link to your work").fill(link);
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Submitted");
  await page.reload();
  await expect(page.getByLabel("Link to your work")).toHaveValue(link);
}

export async function noHorizontalOverflow(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

/** Verify the Sliding Window draft through an isolated published copy, without publishing it or changing existing students. */
import { expect, test } from "@playwright/test";
import { draftModuleFixture } from "./support/draft-module";
import { noHorizontalOverflow, passQuizAndSubmitProject, runAllProblems, walkLessons } from "./support/module-checks";

const fixture = draftModuleFixture("sliding-window", "sliding-window");
test.describe.configure({ mode: "serial" });
test.beforeAll(fixture.setUp);
test.afterAll(fixture.tearDown);
test.beforeEach(({ page }) => fixture.signIn(page));

test("six lessons render, run Python and persist completion; the visualizer shows each window pattern and its preconditions", async ({ page }) => {
  test.setTimeout(240_000);
  await walkLessons(page, fixture.state);

  await page.goto(`/learn/lessons/${fixture.state.lessons[1]!.slug}`);
  const viz = page.getByRole("region", { name: "Interactive visualization: Sliding window" });
  const step = viz.getByRole("button", { name: "Step", exact: true });
  for (let i = 0; i < 60 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("Best sum 9", { exact: true })).toBeVisible();

  await viz.getByText("Try your own input", { exact: true }).click();
  await viz.getByLabel("Window size k", { exact: true }).fill("20");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  await expect(viz.getByRole("alert")).toContainText("between 1 and the list length");

  // The shortest-window mode refuses negative values and explains why.
  await viz.getByLabel("Mode", { exact: true }).selectOption("shortest");
  await viz.getByLabel("List", { exact: true }).fill("4, -5, 3, 3");
  await viz.getByLabel("Target sum", { exact: true }).fill("6");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  await expect(viz.getByRole("alert")).toContainText("nonnegative");
  await viz.getByLabel("List", { exact: true }).fill("2, 3, 1, 2, 4, 3");
  await viz.getByLabel("Target sum", { exact: true }).fill("7");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  await expect(viz.getByRole("alert")).toHaveCount(0);
  for (let i = 0; i < 60 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("Shortest length 2", { exact: true })).toBeVisible();

  // The frequency-map mode needs no numeric parameter.
  await viz.getByLabel("Mode", { exact: true }).selectOption("longest-distinct");
  await expect(viz.getByLabel("Target sum", { exact: true })).toHaveCount(0);
  await viz.getByLabel("List", { exact: true }).fill("1, 2, 1, 3");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  for (let i = 0; i < 60 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("Longest length 3", { exact: true })).toBeVisible();
  await expect(viz.getByText(/\{2: 1, 1: 1, 3: 1\}|\{1: 1, 2: 1, 3: 1\}|\{2: 1, 3: 1, 1: 1\}/).first()).toBeVisible();
  await noHorizontalOverflow(page);
});

test("all six practice problems run visible samples and preserve drafts, history and editorial rules", async ({ page }) => {
  test.setTimeout(240_000);
  await runAllProblems(page, fixture.state);
});

test("the ten-question quiz is graded and the project submission persists", async ({ page }) => {
  await passQuizAndSubmitProject(page, fixture.state, "https://example.com/sliding-window-fixture");
});

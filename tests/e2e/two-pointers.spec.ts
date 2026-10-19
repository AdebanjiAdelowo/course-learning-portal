/** Verify the published Two Pointers module through an isolated copy, without changing existing students. */
import { expect, test } from "@playwright/test";
import { draftModuleFixture } from "./support/draft-module";
import { noHorizontalOverflow, passQuizAndSubmitProject, runAllProblems, walkLessons } from "./support/module-checks";

const fixture = draftModuleFixture("two-pointers", "two-pointers", { published: true });
test.describe.configure({ mode: "serial" });
test.beforeAll(fixture.setUp);
test.afterAll(fixture.tearDown);
test.beforeEach(({ page }) => fixture.signIn(page));

test("six lessons render, run Python and persist completion; the visualizer runs both pointer layouts", async ({ page }) => {
  test.setTimeout(240_000);
  await walkLessons(page, fixture.state);

  await page.goto(`/learn/lessons/${fixture.state.lessons[1]!.slug}`);
  const viz = page.getByRole("region", { name: "Interactive visualization: Two pointers" });
  const step = viz.getByRole("button", { name: "Step", exact: true });
  for (let i = 0; i < 40 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("Pair (2, 4)", { exact: true })).toBeVisible();

  await viz.getByText("Try your own input", { exact: true }).click();
  await viz.getByLabel("List", { exact: true }).fill("1, 3, 4, 6, 9, 11, 14");
  await viz.getByLabel("Target sum", { exact: true }).fill("2");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  for (let i = 0; i < 40 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("No pair", { exact: true })).toBeVisible();

  // An unsorted list is refused and the existing trace is kept.
  await viz.getByLabel("List", { exact: true }).fill("9, 1, 2");
  await viz.getByLabel("Target sum", { exact: true }).fill("3");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  await expect(viz.getByRole("alert")).toContainText("sorted");
  await viz.getByRole("button", { name: "Sort the list for me", exact: true }).click();
  await expect(viz.getByLabel("List", { exact: true })).toHaveValue("1, 2, 9");

  // Same-direction mode needs no target.
  await viz.getByLabel("Mode", { exact: true }).selectOption("same");
  await expect(viz.getByLabel("Target sum", { exact: true })).toHaveCount(0);
  await viz.getByLabel("List", { exact: true }).fill("1, 1, 2, 3, 3, 3");
  await viz.getByRole("button", { name: "Run on this input", exact: true }).click();
  await expect(viz.getByRole("alert")).toHaveCount(0);
  for (let i = 0; i < 40 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("Kept 3 values", { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});

test("all six practice problems run visible samples and preserve drafts, history and editorial rules", async ({ page }) => {
  test.setTimeout(240_000);
  await runAllProblems(page, fixture.state);
});

test("the ten-question quiz is graded and the project submission persists", async ({ page }) => {
  await passQuizAndSubmitProject(page, fixture.state, "https://example.com/two-pointers-fixture");
});

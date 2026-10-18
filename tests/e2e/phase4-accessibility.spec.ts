/**
 * Accessibility of the two Phase 4 visualizers, on isolated copies of the published modules. Includes the shared keyboard, contrast, focus and axe checks, and the Mode control the
 * Phase 4 visualizers add. This is not a screen-reader pass.
 */
import { expect, test } from "@playwright/test";
import { draftModuleFixture } from "./support/draft-module";
import { axeViolations, focused, visualizerAccessibilitySuite } from "./support/visualizer-a11y";

const pointers = draftModuleFixture("two-pointers", "a11y-two-pointers", { published: true });
const windows = draftModuleFixture("sliding-window", "a11y-sliding-window", { published: true });
test.beforeAll(async () => {
  await pointers.setUp();
  await windows.setUp();
});
test.afterAll(async () => {
  await windows.tearDown();
  await pointers.tearDown();
});
// Both temporary modules are open to any enrolled student, so one temporary identity covers both.
test.beforeEach(({ page }) => pointers.signIn(page));

const lesson = (fixture: typeof pointers, index: number) => () => `/learn/lessons/${fixture.state.lessons[index]!.slug}`;

visualizerAccessibilitySuite({ name: "Interactive visualization: Two pointers", invalid: "3, x", url: lesson(pointers, 1) });
visualizerAccessibilitySuite({ name: "Interactive visualization: Sliding window", invalid: "3, x", url: lesson(windows, 1) });

const MODES = [
  { name: "Interactive visualization: Two pointers", url: lesson(pointers, 1), modes: [{ id: "opposite", key: "o", target: "Target sum" }, { id: "same", key: "s", target: null }] },
  { name: "Interactive visualization: Sliding window", url: lesson(windows, 1), modes: [{ id: "fixed", key: "f", target: "Window size k" }, { id: "shortest", key: "s", target: "Target sum" }, { id: "longest-distinct", key: "l", target: null }] },
];

for (const viz of MODES) {
  test(`${viz.name.replace("Interactive visualization: ", "")}: the Mode control is labelled, keyboard operable, keeps focus and stays accessible in every mode`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(viz.url());
    const region = page.getByRole("region", { name: viz.name });
    const summary = region.getByText("Try your own input");
    await summary.focus();
    await page.keyboard.press("Enter");
    const mode = region.getByLabel("Mode", { exact: true });
    await expect(mode).toBeVisible();

    // Logical order inside the form: list, then mode, then the mode's numeric field, then Run.
    await region.getByLabel("List", { exact: true }).focus();
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("Mode");
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe(viz.modes[0]!.target ?? "Run on this input");

    const selector = `section[aria-label="${viz.name}"]`;
    for (const [index, expected] of viz.modes.entries()) {
      if (index > 0) {
        // Type-ahead selects an option on a closed native select on every platform; arrow keys
        // open the option list on macOS instead of changing the value.
        await mode.focus();
        await page.waitForTimeout(1_100); // let the previous type-ahead search expire
        await page.keyboard.press(expected.key);
      }
      await expect(mode).toHaveValue(expected.id);
      if (index > 0) await expect(mode).toBeFocused();
      if (expected.target) await expect(region.getByLabel(expected.target, { exact: true })).toBeVisible();
      else await expect(region.getByRole("textbox", { name: /Target sum|Window size k/ })).toHaveCount(0);
      // Changing mode never moves focus to the page, even when a field disappears.
      expect(await region.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      expect(await axeViolations(page, selector), `${expected.id} mode`).toEqual([]);
    }
  });
}

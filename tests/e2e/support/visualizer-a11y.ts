/**
 * Keyboard, contrast and automated accessibility checks for one visualizer, shared by the Phase 3
 * and Phase 4 suites. This is not a screen-reader pass: announcements are checked through the DOM
 * (live regions, alerts, names and states), not with assistive technology.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

export interface VisualizerUnderTest {
  /** The player region's accessible name. */
  name: string;
  /** Text for the List field that the parser rejects. */
  invalid: string;
  /** The lesson page that embeds the visualizer, resolved when each test runs. */
  url: () => string;
}

/** WCAG 2.1 A and AA violations inside one element, as "rule: target" strings. */
export async function axeViolations(page: Page, selector: string): Promise<string[]> {
  // Evaluated through the DevTools protocol, so the page's Content-Security-Policy is not relaxed.
  await page.evaluate(axeSource);
  return page.evaluate(async (scope) => {
    const axe = (window as unknown as { axe: { run: (context: Element, options: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const result = await axe.run(document.querySelector(scope)!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`));
  }, selector);
}

export const focused = (page: Page) => page.evaluate(() => {
  const element = document.activeElement as HTMLElement | null;
  if (!element || element === document.body) return "<body>";
  return element.getAttribute("aria-label") ?? (element as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? element.textContent?.trim() ?? element.tagName;
});
export const focusInside = (region: Locator) => region.evaluate((element) => element.contains(document.activeElement));

/** WCAG contrast ratio of an element's own text and background colours. */
export const contrast = (button: Locator) => button.evaluate((element) => {
  const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const [r, g, b] = rgb(value).map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const style = getComputedStyle(element);
  const [a, b] = [luminance(style.color), luminance(style.backgroundColor)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
});

export function visualizerAccessibilitySuite(viz: VisualizerUnderTest) {
  test.describe(viz.name.replace("Interactive visualization: ", ""), () => {
    const selector = `section[aria-label="${viz.name}"]`;

    test("has no automated WCAG 2.1 A/AA violations in light and dark themes, or on a phone", async ({ page }) => {
      // Reduced motion removes colour transitions, so a theme switch is measured in its final state.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      await expect(region).toBeVisible();
      await region.getByText("Try your own input").click();
      expect(await axeViolations(page, selector), "light theme").toEqual([]);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      expect(await axeViolations(page, selector), "dark theme").toEqual([]);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await axeViolations(page, selector), "390-pixel viewport").toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    });

    test("is operated by keyboard alone, in a logical order, with visible focus and announced steps", async ({ page }) => {
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      const play = region.getByRole("button", { name: "Play", exact: true });
      await expect(play).toBeVisible();

      // Reset and Back are unavailable on the first step but stay in the tab order, announced as such.
      const reset = region.getByRole("button", { name: "Reset", exact: true });
      await expect(reset).toHaveAttribute("aria-disabled", "true");
      await expect(region.getByRole("button", { name: "Back", exact: true })).toHaveAttribute("aria-disabled", "true");
      await reset.focus();
      const order = [await focused(page)];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        order.push(await focused(page));
      }
      expect(order).toEqual(["Reset", "Back", "Play", "Step", "Speed", expect.stringMatching(/^Step 1 of \d+$/), "Try your own input"]);
      // Activating an unavailable control does nothing.
      await reset.focus();
      await page.keyboard.press("Enter");
      await expect(region.getByText(/^Step 1 of \d+$/)).toBeVisible();

      // A keyboard-focused control shows the focus outline.
      await region.getByRole("button", { name: "Step", exact: true }).focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const outline = await region.getByRole("button", { name: "Step", exact: true }).evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      expect(outline.style).not.toBe("none");
      expect(outline.width).toBeGreaterThanOrEqual(2);

      // Stepping by keyboard advances the trace and the polite live region announces the new step.
      const narration = region.locator('[aria-live="polite"]');
      await expect(narration).toHaveAttribute("aria-atomic", "true");
      const before = await narration.textContent();
      await page.keyboard.press("Enter");
      await expect(region.getByText(/^Step 2 of \d+$/)).toBeVisible();
      await expect(narration).not.toHaveText(before ?? "");
      await page.keyboard.press("Space");
      await expect(region.getByText(/^Step 3 of \d+$/)).toBeVisible();

      // The slider moves with arrow keys.
      await region.getByLabel(/^Step \d+ of \d+$/).focus();
      await page.keyboard.press("ArrowRight");
      await expect(region.getByText(/^Step 4 of \d+$/)).toBeVisible();
      await page.keyboard.press("Home");
      await expect(region.getByText(/^Step 1 of \d+$/)).toBeVisible();

      // Play and Pause toggle from the keyboard.
      await play.focus();
      await page.keyboard.press("Enter");
      await expect(region.getByRole("button", { name: "Pause", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(region.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    });

    test("labels its primary controls legibly in both themes", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      await region.getByText("Try your own input").click();
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
        for (const name of ["Play", "Step", "Run on this input"]) {
          expect(await contrast(region.getByRole("button", { name, exact: true })), `${name} in the ${theme} theme`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    test("keeps keyboard focus in the player when Step or Back reaches the end of the trace", async ({ page }) => {
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      const total = Number((await region.getByText(/^Step 1 of \d+$/).textContent())!.match(/of (\d+)/)![1]);
      await region.getByRole("button", { name: "Step", exact: true }).focus();
      for (let i = 1; i < total; i++) await page.keyboard.press("Enter");
      await expect(region.getByText(new RegExp(`^Step ${total} of ${total}$`))).toBeVisible();
      await expect(region.getByRole("button", { name: "Step", exact: true })).toBeFocused();
      await expect(region.getByRole("button", { name: "Step", exact: true })).toHaveAttribute("aria-disabled", "true");
      await page.keyboard.press("Enter");
      await expect(region.getByText(new RegExp(`^Step ${total} of ${total}$`))).toBeVisible();
      // Keyboard use can continue from where focus landed.
      await page.keyboard.press("Shift+Tab");
      expect(await focusInside(region)).toBe(true);

      await region.getByRole("button", { name: "Back", exact: true }).focus();
      for (let i = 1; i < total; i++) await page.keyboard.press("Enter");
      await expect(region.getByText(new RegExp(`^Step 1 of ${total}$`))).toBeVisible();
      await expect(region.getByRole("button", { name: "Back", exact: true })).toBeFocused();
    });

    test("reports invalid input by keyboard with an alert and an invalid field, and leaves no keyboard trap", async ({ page }) => {
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      const summary = region.getByText("Try your own input");
      await summary.focus();
      await page.keyboard.press("Enter");
      const list = region.getByLabel("List", { exact: true });
      await expect(list).toBeVisible();
      await list.focus();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type(viz.invalid);
      await page.keyboard.press("Enter");
      await expect(region.getByRole("alert")).toBeVisible();
      await expect(list).toHaveAttribute("aria-invalid", "true");
      await expect(region.getByText(/^Step 1 of \d+$/)).toBeVisible();

      // Tabbing forward from the form's last controls leaves the player; Shift+Tab returns into it.
      await region.getByRole("button", { name: "Run on this input" }).focus();
      for (let i = 0; i < 4 && await focusInside(region); i++) await page.keyboard.press("Tab");
      expect(await focusInside(region), "Tab leaves the player").toBe(false);
      // A code editor below may follow; its documented route out is Escape, then Tab or Shift+Tab.
      if (await page.evaluate(() => document.activeElement?.tagName === "TEXTAREA")) await page.keyboard.press("Escape");
      await page.keyboard.press("Shift+Tab");
      expect(await focusInside(region), "Shift+Tab returns").toBe(true);
    });

    test("honours reduced motion and never starts playing on its own", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(viz.url());
      const region = page.getByRole("region", { name: viz.name });
      const step = region.getByRole("button", { name: "Step", exact: true });
      const duration = await step.evaluate((element) => getComputedStyle(element).transitionDuration);
      expect(duration.split(",").every((value) => parseFloat(value) <= 0.001)).toBe(true);
      await page.waitForTimeout(1500);
      await expect(region.getByText(/^Step 1 of \d+$/)).toBeVisible();
      await expect(region.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    });
  });
}

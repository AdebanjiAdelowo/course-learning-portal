/**
 * Keyboard and automated accessibility checks of the three Phase 3 visualizers, on the real published
 * lessons, for a temporary student. This is not a screen-reader pass: announcements are checked
 * through the DOM (live regions, alerts and names), not with assistive technology.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const email = `e2e-a11y-${randomUUID().slice(0, 8)}@example.com`;
const password = `Fixture-${randomUUID()}!`;
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
let userId: string;
let courseId: string;
let baseline: string;

const VISUALIZERS = [
  { lesson: "recursive-calls-and-stack", name: "Interactive visualization: Recursive factorial", invalid: "1, x" },
  { lesson: "dynamic-array-capacity-and-growth", name: "Interactive visualization: Dynamic array operations", invalid: "1, x" },
  { lesson: "singly-linked-insertion-and-deletion", name: "Interactive visualization: Linked-list pointer operations", invalid: "1, x" },
];

function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(result.error?.message ?? "Missing fixture data");
  return result.data;
}

async function existingState(): Promise<string> {
  const state = [];
  state.push(must(await admin.from("modules").select("id, slug, position, phase_id, is_published").eq("course_id", courseId).order("id")));
  for (const table of ["lesson_progress", "quiz_attempts", "submissions", "code_submissions"] as const) {
    const query = admin.from(table).select("*");
    state.push(must(await (table === "lesson_progress" ? query.order("user_id").order("lesson_id") : query.order("id"))));
  }
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

/** WCAG 2.1 A and AA violations inside one element, as "rule: target" strings. */
async function axeViolations(page: Page, selector: string): Promise<string[]> {
  // Evaluated through the DevTools protocol, so the page's Content-Security-Policy is not relaxed.
  await page.evaluate(axeSource);
  return page.evaluate(async (scope) => {
    const axe = (window as unknown as { axe: { run: (context: Element, options: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const result = await axe.run(document.querySelector(scope)!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`));
  }, selector);
}

const focused = (page: Page) => page.evaluate(() => {
  const element = document.activeElement as HTMLElement | null;
  if (!element || element === document.body) return "<body>";
  return element.getAttribute("aria-label") ?? (element as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? element.textContent?.trim() ?? element.tagName;
});
const focusInside = (region: Locator) => region.evaluate((element) => element.contains(document.activeElement));

/** WCAG contrast ratio of an element's own text and background colours. */
const contrast = (button: Locator) => button.evaluate((element) => {
  const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const [r, g, b] = rgb(value).map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const style = getComputedStyle(element);
  const [a, b] = [luminance(style.color), luminance(style.backgroundColor)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
});

test.beforeAll(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error("Accessibility fixtures require local Supabase.");
  courseId = must(await admin.from("courses").select("id").eq("slug", "data-structures-and-algorithms").single()).id;
  baseline = await existingState();
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error || !user.data.user) throw new Error(user.error?.message ?? "Missing fixture user");
  userId = user.data.user.id;
  must(await admin.from("enrollments").insert({ user_id: userId, course_id: courseId, status: "active" }).select("id").single());
  // Open DSA Modules 2 to 4 for this temporary student only, by completing the lessons before them.
  const modules = must(await admin.from("modules").select("id").eq("course_id", courseId).in("slug", ["correctness-and-cost", "recursion-and-induction", "arrays-and-amortised-analysis"]));
  const lessons = must(await admin.from("lessons").select("id").in("module_id", modules.map((m) => m.id)).eq("is_published", true));
  must(await admin.from("lesson_progress").insert(lessons.map((lesson) => ({ user_id: userId, lesson_id: lesson.id }))).select("lesson_id"));
});

test.afterAll(async () => {
  if (userId) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error) throw result.error;
  }
  if (baseline) expect(await existingState(), "Existing ordering and student activity must be unchanged after fixture cleanup").toBe(baseline);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
});

for (const viz of VISUALIZERS) {
  test.describe(viz.name.replace("Interactive visualization: ", ""), () => {
    const selector = `section[aria-label="${viz.name}"]`;

    test("has no automated WCAG 2.1 A/AA violations in light and dark themes, or on a phone", async ({ page }) => {
      // Reduced motion removes colour transitions, so a theme switch is measured in its final state.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/learn/lessons/${viz.lesson}`);
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
      await page.goto(`/learn/lessons/${viz.lesson}`);
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
      await page.goto(`/learn/lessons/${viz.lesson}`);
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
      await page.goto(`/learn/lessons/${viz.lesson}`);
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
      await page.goto(`/learn/lessons/${viz.lesson}`);
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

      // Tabbing forward from the last control leaves the player; Shift+Tab returns into it.
      await region.getByRole("button", { name: "Run on this input" }).focus();
      await page.keyboard.press("Tab");
      expect(await focusInside(region), "Tab leaves the player").toBe(false);
      await page.keyboard.press("Shift+Tab");
      expect(await focusInside(region), "Shift+Tab returns").toBe(true);
    });

    test("honours reduced motion and never starts playing on its own", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/learn/lessons/${viz.lesson}`);
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

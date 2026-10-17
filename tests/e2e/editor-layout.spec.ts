import { expect, test } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

test("long Python editor lines stay inside the editor on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill("student2@example.com");
  await page.getByLabel("Password").fill(process.env.SEED_DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/learn/practice/lower-bound");
  const editor = page.getByLabel("Python solution");
  const code = 'def lower_bound(items, target):\n    "' + "x".repeat(400) + '"\n    return 0\n';
  await editor.fill(code);
  await expect(editor).toHaveValue(code);
  const layer = page.locator('pre[aria-hidden="true"]').filter({ has: page.locator(".hljs-string") });
  await expect(layer).toHaveCSS("position", "absolute");
  await expect(layer).toHaveCSS("overflow-x", "hidden");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // Long lines remain usable through the editor's own horizontal scroll, rather than the page.
  expect(await editor.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
});

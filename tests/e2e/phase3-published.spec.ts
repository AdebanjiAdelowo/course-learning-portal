/** The real published Phase 3 modules, seen by a new temporary student. Existing students are unchanged. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const email = `e2e-published-${randomUUID().slice(0, 8)}@example.com`;
const password = `Fixture-${randomUUID()}!`;
let userId: string;
let courseId: string;
let baseline: string;

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

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error("Published-module fixtures require local Supabase.");
  courseId = must(await admin.from("courses").select("id").eq("slug", "data-structures-and-algorithms").single()).id;
  const published = must(await admin.from("modules").select("slug").eq("course_id", courseId).eq("is_published", true).order("position")).map((m) => m.slug);
  expect(published).toEqual(["python-essentials", "python-collections-and-testing", "correctness-and-cost", "recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists", "two-pointers", "sliding-window"]);
  baseline = await existingState();
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error || !user.data.user) throw new Error(user.error?.message ?? "Missing fixture user");
  userId = user.data.user.id;
  must(await admin.from("enrollments").insert({ user_id: userId, course_id: courseId, status: "active" }).select("id").single());
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

test("a new student finds DSA Modules 2 to 4 locked, by link or by direct address, and planned modules absent", async ({ page }) => {
  await page.goto("/learn/modules/recursion-and-induction");
  await expect(page.getByRole("heading", { name: "This module is locked" })).toBeVisible();
  await page.goto("/learn/lessons/recursive-calls-and-stack");
  await expect(page.getByText(/This lesson belongs to DSA Module 2, which is still locked\. Complete the lessons in "Algorithms, correctness and cost" first\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as complete" })).toHaveCount(0);
  await page.goto("/learn/practice/recursive-sum");
  await expect(page.getByText(/This problem belongs to DSA Module 2, which is still locked\./)).toBeVisible();
  await expect(page.getByLabel("Python solution")).toHaveCount(0);
  await page.goto("/learn/lessons/linked-nodes-and-traversal");
  await expect(page.getByText(/This lesson belongs to DSA Module 4, which is still locked\./)).toBeVisible();

  // The portal streams, so the status is already 200 when notFound() renders (Next.js streaming
  // guide, "The HTTP contract"). A planned module must render exactly what a missing one does.
  for (const address of ["/learn/modules/stacks-and-queues", "/learn/modules/no-such-module"]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1, name: "That page is not part of your course" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stacks, queues and deques" })).toHaveCount(0);
  }
});

test("finishing the Python and DSA Module 1 lessons makes the first recursion lesson the next step, and arrays stays locked", async ({ page }) => {
  // The next step is the earliest unfinished lesson in any open module, so the optional Python
  // modules are completed too. DSA Module 1's lessons alone unlock recursion (see the unit tests).
  const modules = must(await admin.from("modules").select("id").eq("course_id", courseId).in("slug", ["python-essentials", "python-collections-and-testing", "correctness-and-cost"]));
  const lessons = must(await admin.from("lessons").select("id").in("module_id", modules.map((m) => m.id)).eq("is_published", true));
  // Progress for this temporary student only; the fixture user and its rows are deleted afterwards.
  must(await admin.from("lesson_progress").insert(lessons.map((lesson) => ({ user_id: userId, lesson_id: lesson.id }))).select("lesson_id"));

  await page.goto("/learn");
  await expect(page.getByText(/Next lesson · DSA Module 2/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Recursive calls and the call stack" })).toBeVisible();
  await page.getByRole("link", { name: "Continue learning" }).click();
  await expect(page).toHaveURL(/\/learn\/lessons\/recursive-calls-and-stack$/);
  await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();

  await page.goto("/learn/lessons/array-model-and-indexing");
  await expect(page.getByText(/This lesson belongs to DSA Module 3, which is still locked\. Complete the lessons in "Recursion, induction and recurrences" first\./)).toBeVisible();
});

test("a published recursion problem runs its visible samples in the browser and delivers nothing hidden", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (response) => {
    const type = response.request().resourceType();
    if (type === "document" || type === "fetch" || type === "xhr") bodies.push(await response.text().catch(() => ""));
  });
  await page.goto("/learn/practice/recursive-sum");
  await expect(page.getByText("Local sample-test results: not official grading.")).toBeVisible();

  const solution = readFileSync("seed/problems/recursive-sum/solution.py", "utf8");
  const tests = JSON.parse(readFileSync("seed/problems/recursive-sum/tests.json", "utf8")) as { sample: unknown[]; hidden: { args: unknown[] }[] };
  await expect(async () => {
    await page.getByLabel("Python solution").fill(solution);
    await expect(page.getByLabel("Python solution")).toHaveValue(solution);
  }).toPass();
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.locator('[data-run-state="completed"]')).toBeVisible({ timeout: 100_000 });
  await expect(page.locator('[data-test-status="passed"]')).toHaveCount(tests.sample.length);
  await expect(page.locator('[data-test-status="failed"]')).toHaveCount(0);

  // Running samples is local feedback only: nothing was submitted and the editorial is still closed.
  await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toHaveCount(0);
  expect(must(await admin.from("code_submissions").select("id").eq("user_id", userId))).toEqual([]);

  await page.reload();
  const delivered = bodies.join("\n") + (await page.content());
  const editorial = readFileSync("seed/problems/recursive-sum/editorial.md", "utf8").trim().split("\n").find((line) => line.length > 40)!;
  const distinctive = solution.split("\n").map((line) => line.trim()).filter((line) => line.length > 12 && !readFileSync("seed/problems/recursive-sum/starter.py", "utf8").includes(line));
  expect(distinctive.length).toBeGreaterThan(0);
  for (const line of distinctive) expect(delivered.includes(line), `reference solution line: ${line}`).toBe(false);
  expect(delivered.includes(editorial), "editorial text").toBe(false);
  expect(delivered).not.toContain("hidden_tests");
  expect(delivered).not.toContain("reference_solution");
  const visible = new Set((tests.sample as { args: unknown[] }[]).map((t) => JSON.stringify(t.args)));
  // Positive control: the visible samples are in the captured payload, so a leaked hidden case would be too.
  for (const args of visible) if (args.length >= 8) expect(delivered.includes(args), `visible sample ${args}`).toBe(true);
  const longHidden = tests.hidden.map((t) => JSON.stringify(t.args)).filter((args) => args.length >= 8 && !visible.has(args));
  expect(longHidden.length).toBeGreaterThan(0);
  for (const args of longHidden) expect(delivered.includes(args), `hidden case ${args}`).toBe(false);
});

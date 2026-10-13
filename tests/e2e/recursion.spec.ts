/** Verify authored draft content without publishing it or changing existing students. */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const prefix = `e2e-recursion-${randomUUID().slice(0, 8)}`;
const email = `${prefix}@example.com`;
const password = `Fixture-${randomUUID()}!`;
let userId: string;
let moduleId: string;
let courseId: string;
const lessons: { slug: string; title: string }[] = [];
let quizSlug: string;
let projectSlug: string;
let problemSlug: string;
let questions: Database["public"]["Tables"]["questions"]["Row"][] = [];
let keys: Database["public"]["Tables"]["question_keys"]["Row"][] = [];

function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(result.error?.message ?? "Missing fixture data");
  return result.data;
}
function copy<T extends { id: string; search?: unknown }>(row: T) {
  const { id: _id, search: _search, ...rest } = row;
  void _id;
  void _search;
  return rest;
}

test.beforeAll(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error("Recursion fixtures require local Supabase.");
  courseId = must(await admin.from("courses").select("id").eq("slug", "data-structures-and-algorithms").single()).id;
  const source = must(await admin.from("modules").select("*").eq("course_id", courseId).eq("slug", "recursion-and-induction").single());
  expect(source.is_published).toBe(false);
  const last = must(await admin.from("modules").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).single());
  moduleId = must(await admin.from("modules").insert({ ...copy(source), slug: prefix, position: last.position + 1, is_published: true, requires_previous: false, available_from: null }).select("id").single()).id;
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error || !user.data.user) throw new Error(user.error?.message ?? "Missing fixture user");
  userId = user.data.user.id;
  must(await admin.from("enrollments").insert({ user_id: userId, course_id: courseId, status: "active" }).select("id").single());
  for (const lesson of must(await admin.from("lessons").select("*").eq("module_id", source.id).order("position"))) {
    const slug = `${prefix}-${lesson.slug}`;
    must(await admin.from("lessons").insert({ ...copy(lesson), module_id: moduleId, slug }).select("id").single());
    lessons.push({ slug, title: lesson.title });
  }
  const quiz = must(await admin.from("quizzes").select("*").eq("module_id", source.id).single());
  quizSlug = `${prefix}-quiz`;
  const quizId = must(await admin.from("quizzes").insert({ ...copy(quiz), module_id: moduleId, slug: quizSlug }).select("id").single()).id;
  questions = must(await admin.from("questions").select("*").eq("quiz_id", quiz.id).order("position"));
  keys = must(await admin.from("question_keys").select("*").in("question_id", questions.map(q => q.id)));
  for (const question of questions) {
    const id = must(await admin.from("questions").insert({ ...copy(question), quiz_id: quizId }).select("id").single()).id;
    const key = keys.find(k => k.question_id === question.id)!;
    must(await admin.from("question_keys").insert({ ...key, question_id: id }).select("question_id").single());
  }
  const project = must(await admin.from("projects").select("*").eq("module_id", source.id).single());
  projectSlug = `${prefix}-project`;
  must(await admin.from("projects").insert({ ...copy(project), module_id: moduleId, slug: projectSlug }).select("id").single());
  const problem = must(await admin.from("coding_problems").select("*").eq("module_id", source.id).eq("slug", "recursive-sum").single());
  problemSlug = `${prefix}-problem`;
  const problemId = must(await admin.from("coding_problems").insert({ ...copy(problem), module_id: moduleId, slug: problemSlug }).select("id").single()).id;
  const solution = must(await admin.from("coding_problem_solutions").select("*").eq("problem_id", problem.id).single());
  must(await admin.from("coding_problem_solutions").insert({ ...solution, problem_id: problemId }).select("problem_id").single());
});

test.afterAll(async () => {
  if (moduleId) {
    const result = await admin.from("modules").delete().eq("id", moduleId);
    if (result.error) throw result.error;
  }
  if (userId) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error) throw result.error;
  }
});

test.beforeEach(async ({ page }) => {
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
});

test("six lessons render, run Python and persist completion; the stack trace steps and rewinds", async ({ page }) => {
  test.setTimeout(180_000);
  expect(lessons).toHaveLength(6);
  for (const lesson of lessons) {
    await page.goto(`/learn/lessons/${lesson.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: lesson.title })).toBeVisible();
    const run = page.getByRole("button", { name: "Run code", exact: true }).first();
    await expect(run).toBeVisible();
    await run.click();
    await expect(page.locator('[data-run-state="completed"]')).toBeVisible({ timeout: 100_000 });
    await page.getByRole("button", { name: "Mark as complete", exact: true }).click();
    await page.reload();
    await expect(page.getByText("Lesson complete", { exact: true })).toBeVisible();
  }
  await page.goto(`/learn/lessons/${lessons[0].slug}`);
  const viz = page.getByRole("region", { name: "Interactive visualization: Recursive factorial" });
  await expect(viz.getByRole("list", { name: "Call-stack frames" })).toBeVisible();
  const step = viz.getByRole("button", { name: "Step", exact: true });
  await step.click();
  await viz.getByRole("button", { name: "Back", exact: true }).click();
  await expect(viz.getByText(/^Step 1 of/)).toBeVisible();
  await viz.getByLabel("Speed", { exact: true }).selectOption("450");
  await viz.getByRole("button", { name: "Play", exact: true }).click();
  await expect(viz.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await viz.getByRole("button", { name: "Pause", exact: true }).click();
  for (let i = 0; i < 40 && await step.isEnabled(); i++) await step.click();
  await expect(viz.getByText("factorial(4) = 24", { exact: true })).toBeVisible();
  await expect(viz.getByText("The stack is empty.", { exact: true })).toBeVisible();
  await viz.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(viz.getByText(/^Step 1 of/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("visible samples, draft, submission history and editorial preserve the self-review boundary", async ({ page }) => {
  await page.goto(`/learn/practice/${problemSlug}`);
  const code = readFileSync("seed/problems/recursive-sum/solution.py", "utf8");
  await expect(async () => {
    await page.getByLabel("Python solution").fill(code);
    await expect(page.getByLabel("Python solution")).toHaveValue(code);
  }).toPass();
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.locator('[data-run-state="completed"]')).toBeVisible({ timeout: 100_000 });
  await expect(page.locator('[data-test-status="failed"]')).toHaveCount(0);
  await expect(page.locator('[data-test-status="passed"]')).toHaveCount(3);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Python solution")).toHaveValue(code);
  await page.getByRole("button", { name: "Submit for self-review", exact: true }).click();
  await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toBeVisible();
  await page.getByText("Read the editorial and the reference solution", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reference solution", exact: true })).toBeVisible();
  await expect(page.getByText(/Submission does not mean the solution is correct/)).toBeVisible();
});

test("the ten-question quiz is graded and the project submission persists", async ({ page }) => {
  await page.goto(`/learn/quizzes/${quizSlug}`);
  expect(questions).toHaveLength(10);
  for (const [index, q] of questions.entries()) {
    await expect(page.getByText(`Question ${index + 1} of 10`)).toBeVisible();
    const correct = keys.find(k => k.question_id === q.id)!.correct;
    const options = q.options as { id: string; text: string }[];
    if (q.type === "multiple_choice") await page.getByRole("radio").nth(options.findIndex(o => o.id === correct)).check();
    else if (q.type === "multiple_select") {
      for (const id of correct as string[]) await page.getByRole("checkbox").nth(options.findIndex(o => o.id === id)).check();
    } else if (q.type === "true_false") await page.getByRole("radio", { name: correct ? "True" : "False", exact: true }).check();
    else await page.getByLabel("Your answer").fill((correct as string[])[0]);
    await page.getByRole("button", { name: index === 9 ? "Review answers" : "Save answer and continue" }).click();
  }
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Passed", { exact: true })).toBeVisible();
  await page.goto(`/learn/projects/${projectSlug}`);
  await expect(page.getByRole("heading", { name: "Grading rubric" })).toBeVisible();
  await page.getByLabel("Link to your work").fill("https://example.com/recursion-fixture");
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Submitted");
  await page.reload();
  await expect(page.getByLabel("Link to your work")).toHaveValue("https://example.com/recursion-fixture");
});

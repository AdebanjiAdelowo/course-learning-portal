/**
 * The instructor's content editors: quizzes with questions, projects and resources, and what a
 * student then sees. Everything created here is removed again with the service role.
 *
 * Requires a seeded local stack: `npm run db:start && npm run seed`.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";
const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(page: Page, email: string) {
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/learn/login"));
}

/** The content-page card of the one published module. Planned modules come before it. */
function publishedModule(page: Page) {
  return page.locator("li.card").filter({ has: page.getByRole("heading", { level: 3, name: "Algorithms, correctness and cost" }) });
}

test("an instructor builds and publishes a quiz, and a student can take it", async ({ page, browser }) => {
  const stamp = Date.now();
  const title = `Authoring check ${stamp}`;
  const slug = `authoring-check-${stamp}`;
  const studentContext = await browser.newContext();
  try {
    await signIn(page, "instructor@example.com");
    await page.goto("/admin/content");
    await publishedModule(page).getByRole("link", { name: "Quiz", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "New quiz" })).toBeVisible();

    // The slug follows the title.
    await page.getByLabel("Title").fill(title);
    await expect(page.getByLabel("Slug")).toHaveValue(slug);
    await page.getByLabel("Description").fill("Created by an automated test.");
    await page.getByRole("button", { name: "Create quiz" }).click();

    await expect(page).toHaveURL(/\/admin\/content\/quizzes\/[0-9a-f-]{36}\?created=1$/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const settings = page.getByRole("region", { name: "Settings" });
    await expect(settings.getByText("Draft", { exact: true })).toBeVisible();

    // An empty quiz cannot be published.
    await settings.getByLabel("Published").check();
    await settings.getByRole("button", { name: "Save quiz settings" }).click();
    await expect(settings.getByText("Add at least one question before publishing.")).toBeVisible();

    // A multiple-choice question needs exactly one starred option; the typed text survives the error.
    const add = page.getByRole("region", { name: "Add a question" });
    await add.getByLabel("Question", { exact: true }).fill("Which scheme is second-order accurate, with error $\\mathcal{O}(\\Delta x^2)$?");
    await add.getByLabel("Options").fill("Forward difference\nCentral difference\nBackward difference");
    await add.getByLabel("Explanation").fill("The odd-order Taylor terms cancel.");
    await add.getByRole("button", { name: "Add question" }).click();
    await expect(add.getByText(/Mark exactly one option as correct/)).toBeVisible();
    await expect(add.getByLabel("Options")).toHaveValue("Forward difference\nCentral difference\nBackward difference");

    await add.getByLabel("Options").fill("Forward difference\n* Central difference\nBackward difference");
    await add.getByRole("button", { name: "Add question" }).click();
    await expect(add.getByRole("status")).toContainText("Question added");
    await expect(page.getByText("1 question · 1 point in total")).toBeVisible();

    // A second question of another type, worth two points.
    await add.getByLabel("Question type").selectOption("true_false");
    await add.getByLabel("Question", { exact: true }).fill("An explicit scheme is stable for every time step.");
    await add.getByLabel("Correct answer").selectOption("false");
    await add.getByLabel("Points").fill("2");
    await add.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText("2 questions · 3 points in total")).toBeVisible();

    // Reorder: the true/false question moves to the top.
    await page.getByText("An explicit scheme is stable for every time step.").first().click();
    await page.getByRole("button", { name: "Move question 2 up" }).click();
    await expect(page.locator("ol > li").first()).toContainText("An explicit scheme is stable");

    await settings.getByLabel("Published").check();
    await settings.getByRole("button", { name: "Save quiz settings" }).click();
    await expect(settings.getByRole("status").filter({ hasText: "Quiz saved" })).toBeVisible();

    // The answer key was stored with the question.
    const { data: stored } = await admin.from("quizzes").select("is_published, questions(type, points, key:question_keys(correct))").eq("slug", slug).single();
    expect(stored?.is_published).toBe(true);
    expect(stored?.questions.map((q) => q.key?.correct).sort()).toEqual(["b", false].sort());

    // A student sees the new quiz and can answer it; the first question is the reordered one.
    const student = await studentContext.newPage();
    await signIn(student, "student@example.com");
    await student.goto(`/learn/quizzes/${slug}`);
    await expect(student.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(student.getByText("Question 1 of 2")).toBeVisible();
    await expect(student.getByText("An explicit scheme is stable for every time step.")).toBeVisible();
    await student.getByRole("radio", { name: "False" }).check();
    await student.getByRole("button", { name: "Save answer and continue" }).click();
    await expect(student.locator(".katex").first()).toBeVisible();
    await student.getByRole("radio").nth(1).check();
    await student.getByRole("button", { name: "Review answers" }).click();
    await student.getByRole("button", { name: "Submit quiz" }).click();
    await expect(student).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
    await expect(student.getByText("100%", { exact: true })).toBeVisible();
    await expect(student.getByText("3 of 3 points")).toBeVisible();
    await expect(student.getByText("The odd-order Taylor terms cancel.")).toBeVisible();

    // The instructor is told that attempts now exist.
    await page.reload();
    await expect(page.getByText(/Students have made 1 attempt at this quiz/)).toBeVisible();
  } finally {
    await studentContext.close();
    await admin.from("quizzes").delete().eq("slug", slug);
  }
});

test("an instructor creates a project with a rubric, and a student sees it", async ({ page, browser }) => {
  const stamp = Date.now();
  const title = `Rubric check ${stamp}`;
  const slug = `rubric-check-${stamp}`;
  const studentContext = await browser.newContext();
  try {
    await signIn(page, "instructor@example.com");
    await page.goto("/admin/content");
    await publishedModule(page).getByRole("link", { name: "Project", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "New project" })).toBeVisible();

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Summary").fill("Created by an automated test.");
    await page.getByLabel("Brief").fill("Solve $u_t = u_{xx}$ and **verify** the result.");
    await page.getByLabel("Objectives").fill("Implement the scheme\nMeasure the error");
    await page.getByLabel("Deadline").fill("2027-03-15T17:00");
    await page.getByLabel("Grading rubric").fill("Correctness | Works | sixty");
    await page.getByLabel("Published").check();
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText(/Rubric line 1: points must be a whole number/)).toBeVisible();
    // Nothing typed is lost.
    await expect(page.getByLabel("Brief")).toHaveValue("Solve $u_t = u_{xx}$ and **verify** the result.");

    await page.getByLabel("Grading rubric").fill("Correctness | Reproduces the reference solution | 70\nReporting | Clear and reproducible | 30");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/projects\/[0-9a-f-]{36}\?created=1$/);
    // The deadline round-trips through the instructor's time zone unchanged.
    await expect(page.getByLabel("Deadline")).toHaveValue("2027-03-15T17:00");

    const { data: stored } = await admin.from("projects").select("max_points, due_at, objectives, is_published").eq("slug", slug).single();
    expect(stored).toMatchObject({ max_points: 100, is_published: true, objectives: ["Implement the scheme", "Measure the error"] });
    // The instructor is in Europe/Rome: 17:00 local on 15 March is 16:00 UTC.
    expect(new Date(stored!.due_at!).toISOString()).toBe("2027-03-15T16:00:00.000Z");

    const student = await studentContext.newPage();
    await signIn(student, "student@example.com");
    await student.goto(`/learn/projects/${slug}`);
    await expect(student.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(student.getByRole("row", { name: /Correctness.*70/ })).toBeVisible();
    await expect(student.getByRole("row", { name: /Total.*100/ })).toBeVisible();
    await expect(student.locator(".katex").first()).toBeVisible();
  } finally {
    await studentContext.close();
    await admin.from("projects").delete().eq("slug", slug);
  }
});

test("an instructor adds and removes a resource", async ({ page, browser }) => {
  const title = `Reading list ${Date.now()}`;
  const studentContext = await browser.newContext();
  try {
    await signIn(page, "instructor@example.com");
    await page.goto("/admin/content/resources");
    const form = page.getByRole("region", { name: "Add a resource" });

    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Link or file path").fill("javascript:alert(1)");
    await form.getByRole("button", { name: "Add resource" }).click();
    await expect(form.getByText(/Enter an https:\/\/ link/)).toBeVisible();

    await form.getByLabel("Link or file path").fill("https://example.com/reading-list");
    await form.getByLabel("Type").selectOption("reading");
    await form.getByLabel("Belongs to").selectOption({ label: "1.4 Binary search" });
    await form.getByRole("button", { name: "Add resource" }).click();
    await expect(form.getByRole("status")).toContainText("Resource added");
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

    const student = await studentContext.newPage();
    await signIn(student, "student@example.com");
    await student.goto("/learn/lessons/binary-search");
    await expect(student.getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", "https://example.com/reading-list");

    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  } finally {
    await studentContext.close();
    await admin.from("resources").delete().eq("title", title);
  }
});

test("lessons can be reordered from the content page", async ({ page }) => {
  await signIn(page, "instructor@example.com");
  await page.goto("/admin/content");
  const card = publishedModule(page);
  const titles = () => card.locator("ol").first().getByRole("link").allInnerTexts();

  await expect.poll(async () => (await titles())[0]).toContain("1. Problems, algorithms and correctness");
  await page.getByRole("button", { name: "Move Problems, algorithms and correctness down" }).click();
  await expect.poll(async () => (await titles())[0]).toContain("Counting cost");
  await expect.poll(async () => (await titles())[1]).toContain("2. Problems, algorithms and correctness");

  // Put it back, so the seeded order is unchanged for the other tests.
  await page.getByRole("button", { name: "Move Problems, algorithms and correctness up" }).click();
  await expect.poll(async () => (await titles())[0]).toContain("1. Problems, algorithms and correctness");
});

test("a module is managed from the content page: planned until it has a lesson, and editable", async ({ page }) => {
  await signIn(page, "instructor@example.com");
  await page.goto("/admin/content");
  await expect(page.getByText(/6 of 34 modules published/)).toBeVisible();

  const planned = page.locator("li.card").filter({ has: page.getByRole("heading", { level: 3, name: "Two pointers", exact: true }) });
  await expect(planned.getByText("Planned", { exact: true })).toBeVisible();
  await expect(planned.getByText(/Phase 3: Linear structures and sorting/)).toBeVisible();
  await expect(planned.getByText(/DSA Module 5/)).toBeVisible();
  await planned.getByRole("link", { name: "Edit module" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Two pointers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan shown to students" })).toBeVisible();

  // A module with no published lesson cannot be published: it would be an empty module.
  await page.getByLabel("Published").check();
  await page.getByRole("button", { name: "Save module" }).click();
  await expect(page.getByText(/Publish at least one lesson in this module first/)).toBeVisible();

  // Its description can be edited, and the edit is saved while it stays planned.
  const description = page.getByRole("textbox", { name: "Description" });
  const original = await description.inputValue();
  await page.getByLabel("Published").uncheck();
  await description.fill(`${original} (edited by a test)`);
  await page.getByRole("button", { name: "Save module" }).click();
  await expect(page.getByRole("status")).toContainText("shown to students as planned");
  await description.fill(original);
  await page.getByRole("button", { name: "Save module" }).click();
  await expect(page.getByRole("status")).toContainText("Module saved");

  await page.goto("/admin/content");
  await expect(page.getByText(/6 of 34 modules published/)).toBeVisible();
});

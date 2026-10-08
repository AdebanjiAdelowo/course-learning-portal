/**
 * End-to-end checks of the flows that matter most: access control, sign-in, persistent lesson
 * completion, quizzes, project submission and the instructor area.
 *
 * Uses the second demo student so the first keeps its showcase state. Requires a seeded local
 * stack: `npm run db:start && npm run seed`.
 */
import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";
const STUDENT = "student2@example.com";
const INSTRUCTOR = "instructor@example.com";

async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signIn(page: Page, email: string) {
  await submitLogin(page, email, PASSWORD);
  await page.waitForURL((url) => !url.pathname.startsWith("/learn/login"));
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/learn\/login$/);
}

test.beforeAll(() => {
  expect(PASSWORD, "SEED_DEMO_PASSWORD must be set in .env.local").not.toBe("");
});

test.describe("access control", () => {
  test("visitors are redirected to the login page and returned afterwards", async ({ page }) => {
    await page.goto("/learn/curriculum");
    await expect(page).toHaveURL(/\/learn\/login\?next=%2Flearn%2Fcurriculum$/);
    await page.getByLabel("Email address").fill(STUDENT);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/learn\/curriculum$/);
  });

  test("every protected area redirects without a session", async ({ page }) => {
    for (const path of ["/learn", "/learn/lessons/finite-differences", "/learn/settings", "/admin", "/admin/submissions"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/learn\/login/);
    }
  });

  test("wrong credentials are rejected without revealing which part was wrong", async ({ page }) => {
    await submitLogin(page, STUDENT, "definitely-not-the-password");
    await expect(page.getByRole("alert").filter({ hasText: "do not match" })).toBeVisible();
    await submitLogin(page, "nobody@example.com", "definitely-not-the-password");
    await expect(page.getByRole("alert").filter({ hasText: "do not match" })).toBeVisible();
    await expect(page).toHaveURL(/\/learn\/login/);
  });

  test("a student cannot open the instructor area", async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back, Lukas/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("signing out ends the session", async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await signOut(page);
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/learn\/login/);
  });
});

test.describe("password reset", () => {
  test("the request form gives the same answer for any address", async ({ page }) => {
    await page.goto("/learn/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If that address has an account");
  });

  test("an invalid reset link is refused", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=not-a-real-token&type=recovery&next=/learn/update-password");
    await expect(page).toHaveURL(/\/learn\/forgot-password\?error=expired/);
    await expect(page.getByRole("alert").filter({ hasText: "expired" })).toBeVisible();
  });
});

test.describe("learning", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });

  test("the dashboard says what to do next", async ({ page }) => {
    await expect(page.getByText(/Next lesson · Module 1/i)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Overall course completion", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Continue learning" }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/stability-and-cfl$/);
    await expect(page.getByRole("heading", { level: 1, name: "Stability and the CFL condition" })).toBeVisible();
  });

  test("a lesson renders mathematics, code and figures", async ({ page }) => {
    await page.goto("/learn/lessons/finite-differences");
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator("pre code.hljs").first()).toContainText("import numpy as np");
    await expect(page.getByRole("img", { name: /Error of forward and central differences/ })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("Central difference");
    await expect(page.getByRole("link", { name: /Finite-difference reference sheet/ })).toHaveAttribute("href", "/resources/finite-difference-reference-sheet.pdf");
  });

  test("lesson completion persists across reloads and sign-out, and unlocks the next module", async ({ page }) => {
    const lesson = "/learn/lessons/stability-and-cfl";
    await page.goto(lesson);

    // Start from a known state so the test can be re-run.
    const undo = page.getByRole("button", { name: "Mark as not complete" });
    if (await undo.isVisible()) {
      await undo.click();
      await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
    }

    // Module 2 is locked until this last lesson of Module 1 is done.
    await page.goto("/learn/lessons/universal-approximation");
    await expect(page.getByText("which is still locked")).toBeVisible();

    await page.goto(lesson);
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await signOut(page);
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await page.goto(lesson);
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await page.goto("/learn/lessons/universal-approximation");
    await expect(page.getByRole("heading", { level: 1, name: "Universal approximation in practice" })).toBeVisible();
    await expect(page.getByText("which is still locked")).toHaveCount(0);

    // Restore the seeded state.
    await page.goto(lesson);
    await page.getByRole("button", { name: "Mark as not complete" }).click();
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
  });

  test("a quiz is graded on the server, explained, and recorded in the history", async ({ page }) => {
    await page.goto("/learn/quizzes/numerical-foundations-quiz");
    await expect(page.getByText("Question 1 of 5")).toBeVisible();
    const history = page.getByRole("region", { name: "Attempt history" });
    const attemptsBefore = await history.getByRole("row").count();

    // The page must not contain the answer key before submission.
    expect(await page.content()).not.toContain("The odd-order terms of the two Taylor expansions cancel");

    await expect(page.getByText("Question 1 of 5")).toBeVisible();
    await page.getByRole("radio").nth(1).check(); // O(dx^2): correct
    await page.getByRole("button", { name: "Save answer and continue" }).click();

    await expect(page.getByText("Question 2 of 5")).toBeVisible();
    await page.getByRole("radio", { name: "False" }).check(); // correct
    await page.getByRole("button", { name: "Save answer and continue" }).click();

    await expect(page.getByText("Question 3 of 5")).toBeVisible();
    await page.getByLabel("Your answer").fill("0.50"); // correct, in a different number format
    await page.getByRole("button", { name: "Save answer and continue" }).click();

    await expect(page.getByText("Question 4 of 5")).toBeVisible();
    await page.getByRole("checkbox").nth(0).check(); // incomplete selection: scores zero
    await page.getByRole("button", { name: "Save answer and continue" }).click();

    await expect(page.getByText("Question 5 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Review answers" }).click(); // left unanswered

    await expect(page.getByText("You have left 1 question unanswered")).toBeVisible();
    await page.getByRole("button", { name: "Submit quiz" }).click();

    // 3 of 6 points: questions 1 to 3 are worth one each, question 4 two, question 5 one.
    await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
    await expect(page.getByText("50%", { exact: true })).toBeVisible();
    await expect(page.getByText("Not passed", { exact: true })).toBeVisible();
    await expect(page.getByText("3 of 6 points")).toBeVisible();
    await expect(page.getByText("The odd-order terms of the two Taylor expansions cancel")).toBeVisible();
    await expect(page.getByText("No answer")).toBeVisible();

    await page.getByRole("link", { name: "Try again" }).click();
    await expect(page.getByText("Question 1 of 5")).toBeVisible();
    await expect(history.getByRole("row")).toHaveCount(attemptsBefore + 1);
  });

  test("a project can be saved as a draft and needs a link to be submitted", async ({ page }) => {
    await page.goto("/learn/projects/verified-heat-solver");
    await expect(page.getByRole("heading", { name: "Grading rubric" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Project 1 starter notebook/ })).toBeVisible();

    const link = page.getByLabel("Link to your work");
    const original = await link.inputValue();
    await link.fill("");
    await page.getByRole("button", { name: /Update submission|Submit for review/ }).click();
    await expect(page.getByText("Add a link to your work before submitting.")).toBeVisible();

    await link.fill("http://insecure.example/repo");
    await page.getByRole("button", { name: /Update submission|Submit for review/ }).click();
    await expect(page.getByText("Enter a full https:// link.")).toBeVisible();
    // A validation error must not wipe what the student typed.
    await expect(link).toHaveValue("http://insecure.example/repo");

    await link.fill(original || "https://github.com/example/ftcs-heat");
    await page.getByRole("button", { name: /Update submission|Submit for review/ }).click();
    await expect(page.getByRole("status")).toContainText("Submitted");
  });

  test("search links straight to matching content", async ({ page }) => {
    await page.getByRole("search").getByLabel("Search the course").first().fill("stability");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/learn\/search\?q=stability/);
    await page.getByRole("link", { name: /Stability and the CFL condition/ }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/stability-and-cfl$/);
  });

  test("the remaining sections load", async ({ page }) => {
    for (const [path, heading] of [
      ["/learn/curriculum", "Foundations of Scientific Machine Learning"],
      ["/learn/sessions", "Seminars and office hours"],
      ["/learn/resources", "Course library"],
      ["/learn/feedback", "Feedback from your instructor"],
      ["/learn/progress", "Your progress"],
      ["/learn/settings", "Profile and settings"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading }), path).toBeVisible();
    }
  });
});

test.describe("small screens", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("navigation and the lesson contents become drawers, with no sideways scrolling", async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Curriculum" }).click();
    await expect(page).toHaveURL(/\/learn\/curriculum$/);
    await expect(drawer).toBeHidden();

    await page.goto("/learn/lessons/finite-differences");
    await page.getByRole("button", { name: "Course contents" }).click();
    const contents = page.getByRole("dialog", { name: "Course contents" });
    await expect(contents.getByRole("link", { name: /Differential equations as models/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(contents).toBeHidden();

    for (const path of ["/learn", "/learn/lessons/finite-differences", "/learn/projects/verified-heat-solver", "/"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("instructor area", () => {
  test("an instructor sees the cohort and can publish and remove an announcement", async ({ page }) => {
    await signIn(page, INSTRUCTOR);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Cohort overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Amina Yusuf" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lukas Weber" })).toBeVisible();

    await page.goto("/admin/submissions");
    await expect(page.getByRole("link", { name: /A verified 1D heat-equation solver/ }).first()).toBeVisible();

    const title = `E2E announcement ${Date.now()}`;
    await page.goto("/admin/announcements");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Message").fill("Posted by an automated test.");
    await page.getByRole("button", { name: "Publish announcement" }).click();
    await expect(page.getByRole("status")).toContainText("published");
    await expect(page.getByText(title)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });
});

test.describe("public website", () => {
  test("the landing page presents the course and links to the login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Foundations of Scientific Machine Learning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Module by module" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dr. Helena Voss" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Frequently asked" })).toBeVisible();
    await page.getByRole("link", { name: "Student login" }).first().click();
    await expect(page).toHaveURL(/\/learn\/login$/);
  });

  test("the contact form validates input and stores a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();

    await page.getByLabel("Your name").fill("Playwright Test");
    await page.getByLabel("Email address").fill("playwright@example.com");
    await page.getByLabel("Message").fill("This message was sent by the automated end-to-end test.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Your message has reached the course team");
  });
});

/**
 * End-to-end checks of the flows that matter most: access control, sign-in, the learning path,
 * lessons and visualizations, quizzes, coding practice, project submission and the instructor
 * area.
 *
 * Uses the second demo student so the first keeps its showcase state. Requires a seeded local
 * stack: `npm run db:start && npm run seed`.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";
const STUDENT = "student2@example.com";
const INSTRUCTOR = "instructor@example.com";

// Used only to put test data back as it was; never to make a check pass.
const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function studentId(): Promise<string> {
  const { data } = await admin.from("profiles").select("id").eq("email", STUDENT).single();
  if (!data) throw new Error("The demo student is missing. Run `npm run seed`.");
  return data.id;
}

async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Fill a code editor and wait until the editor itself has the text. The editor is rendered on
 * the server, and text entered while the page is still becoming interactive can be merged with
 * what was there. The line count in its status bar comes from the editor's state.
 */
async function fillEditor(editor: Locator, text: string) {
  const lines = text.split("\n").length;
  const status = editor.page().getByText(new RegExp(`· ${lines} lines?$`));
  await expect(async () => {
    await editor.fill(text);
    await expect(editor).toHaveValue(text, { timeout: 1000 });
    await expect(status).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
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
    for (const path of [
      "/learn",
      "/learn/lessons/binary-search",
      "/learn/practice",
      "/learn/practice/lower-bound",
      "/learn/files/module-1/notes.pdf",
      "/learn/settings",
      "/admin",
      "/admin/submissions",
      "/admin/content",
    ]) {
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

  test("a student cannot open any part of the instructor area", async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back, Lukas/ })).toBeVisible();
    for (const path of ["/admin", "/admin/content", "/admin/students", "/admin/submissions"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/learn$/);
    }
  });

  test("signing out ends the session", async ({ page }) => {
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await signOut(page);
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/learn\/login/);
    await page.goto("/learn/practice/lower-bound");
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

  test("the portal is DSA Academy, and the dashboard says what to do next", async ({ page }) => {
    await expect(page.getByRole("banner").getByRole("link", { name: "DSA Academy" })).toBeVisible();
    await expect(page).toHaveTitle(/DSA Academy/);
    expect(await page.content()).not.toMatch(/Isocline|Scientific Machine Learning/);

    await expect(page.getByText(/Next lesson · DSA Module 1/i)).toBeVisible();
    await expect(page.locator("p", { hasText: "Current module" })).toContainText("DSA Module 1: Algorithms, correctness and cost");
    await expect(page.getByRole("progressbar", { name: "Overall course completion", exact: true })).toBeVisible();
    await expect(page.getByText("3 modules available · 31 modules planned")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coding practice" })).toBeVisible();
    await page.getByRole("link", { name: "Continue learning" }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/insertion-sort$/);
    await expect(page.getByRole("heading", { level: 1, name: "Insertion sort" })).toBeVisible();
  });

  test("the curriculum shows eight phases, with planned modules labelled and not openable", async ({ page }) => {
    await page.goto("/learn/curriculum");
    await expect(page.getByRole("heading", { level: 1, name: "Data Structures and Algorithms" })).toBeVisible();
    await expect(page.getByText("8 phases · 3 modules available · 31 modules planned")).toBeVisible();

    const phases = page.getByRole("heading", { level: 2 });
    await expect(phases).toHaveText([
      "Python foundations",
      "Foundations",
      "Linear structures and sorting",
      "Hashing and trees",
      "Graphs",
      "Algorithm design techniques",
      "Strings and advanced structures",
      "Limits and synthesis",
    ]);

    // The phase the student is working in is open, with the published module as a link, and
    // it is numbered as the first DSA module although two Python modules come before it.
    const available = page.getByRole("link", { name: "Algorithms, correctness and cost" });
    await expect(available).toBeVisible();
    await expect(page.getByText("DSA Module 1", { exact: true })).toBeVisible();
    await expect(page.getByText("DSA Module 2", { exact: true })).toBeVisible(); // planned, same phase
    await expect(page.getByText("Module 3", { exact: true })).toHaveCount(0);

    // Python preparation is numbered separately.
    await page.getByText("Phase 1", { exact: true }).click();
    await expect(page.getByText("Python Module P1", { exact: true })).toBeVisible();
    await expect(page.getByText("Python Module P2", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Python essentials/ })).toBeVisible();
    await expect(page.getByText("5 lessons", { exact: false }).first()).toBeVisible();

    // A planned module is shown by title, marked as planned, and is not a link.
    await page.getByText("Phase 3", { exact: true }).click();
    const planned = page.locator("div").filter({ has: page.getByRole("heading", { level: 3, name: "Two pointers", exact: true }) }).last();
    await expect(planned.getByText("Planned", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Two pointers", exact: true })).toHaveCount(0);
    await planned.getByText("What this module will cover").click();
    await expect(planned.getByText(/Use opposite-direction pointers on sorted input/)).toBeVisible();
    await expect(planned.getByText("Comes after:")).toBeVisible();

    // Planned content cannot be reached by guessing its address.
    // (The portal streams its pages, so the not-found page arrives with status 200.)
    await page.goto("/learn/modules/two-pointers");
    await expect(page.getByRole("heading", { level: 1, name: "That page is not part of your course" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Two pointers" })).toHaveCount(0);

    await page.goto("/learn/curriculum");
    await available.click();
    await expect(page).toHaveURL(/\/learn\/modules\/correctness-and-cost$/);
    await expect(page.getByText(/Phase 2: Foundations · DSA Module 1/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practice problems" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lower bound" })).toBeVisible();
  });

  test("a lesson renders mathematics, code, figures, tables and resources", async ({ page }) => {
    await page.goto("/learn/lessons/asymptotic-notation");
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator("pre code").filter({ hasText: "def witness_holds" })).toBeVisible();
    await expect(page.locator("pre code .hljs-keyword").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Growth of common functions/ })).toBeVisible();
    const loaded = await page.getByRole("img", { name: /Growth of common functions/ }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(loaded, "the figure should load under the content security policy").toBe(true);

    await page.goto("/learn/lessons/binary-search");
    await expect(page.getByRole("table").filter({ hasText: "Worst-case iterations" })).toContainText("Linear search");
    await expect(page.getByRole("link", { name: /the bisect module/ }).first()).toHaveAttribute("href", "https://docs.python.org/3/library/bisect.html");
  });

  test("a visualization steps forwards and backwards, plays, and runs on the student's own input", async ({ page }) => {
    await page.goto("/learn/lessons/binary-search");
    const viz = page.getByRole("region", { name: "Interactive visualization: Binary search" });
    await expect(viz).toBeVisible();
    const position = viz.getByText(/^Step \d+ of \d+$/);
    await expect(position).toHaveText(/^Step 1 of \d+$/);
    await expect(viz.getByRole("button", { name: "Back" })).toBeDisabled();
    await expect(viz.getByRole("button", { name: "Reset" })).toBeDisabled();

    await viz.getByRole("button", { name: "Step" }).click();
    await expect(position).toHaveText(/^Step 2 of/);
    await expect(viz.locator('[aria-current="step"]')).toContainText("mid = floor((lo + hi) / 2)");
    await expect(viz.getByText("iterations", { exact: true })).toBeVisible();
    await viz.getByRole("button", { name: "Back" }).click();
    await expect(position).toHaveText(/^Step 1 of/);

    // Play advances on its own; Pause stops it.
    await viz.getByLabel("Speed").selectOption({ label: "Fast" });
    await viz.getByRole("button", { name: "Play" }).click();
    await expect(position).not.toHaveText(/^Step 1 of/);
    await viz.getByRole("button", { name: "Pause" }).click();
    const paused = await position.innerText();
    await page.waitForTimeout(1200);
    await expect(position).toHaveText(paused);

    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(position).toHaveText(/^Step 1 of/);

    // Custom input is validated against the algorithm's precondition.
    await viz.getByText("Try your own input").click();
    await viz.getByLabel("List").fill("9, 2, 5");
    await viz.getByLabel("Target").fill("5");
    await viz.getByRole("button", { name: "Run on this input" }).click();
    await expect(viz.getByRole("alert")).toContainText("requires the list to be sorted");
    await viz.getByRole("button", { name: "Sort the list for me" }).click();
    await expect(viz.getByLabel("List")).toHaveValue("2, 5, 9");
    await viz.getByRole("button", { name: "Run on this input" }).click();
    await expect(position).toHaveText(/^Step 1 of/);
    const step = viz.getByRole("button", { name: "Step" });
    for (let i = 0; i < 30 && (await step.isEnabled()); i++) await step.click();
    await expect(viz.getByText("Found at index 1")).toBeVisible();
    await expect(viz.getByRole("button", { name: "Replay" })).toBeVisible();
  });

  test("the other two visualizations load in their lessons", async ({ page }) => {
    await page.goto("/learn/lessons/counting-cost");
    await expect(page.getByRole("region", { name: "Interactive visualization: Linear search" })).toBeVisible();
    await page.goto("/learn/lessons/insertion-sort");
    const viz = page.getByRole("region", { name: "Interactive visualization: Insertion sort" });
    await expect(viz).toBeVisible();
    const step = viz.getByRole("button", { name: "Step" });
    for (let i = 0; i < 80 && (await step.isEnabled()); i++) await step.click();
    await expect(viz.getByText("Sorted", { exact: true })).toBeVisible();
    // The input 31, 12, 45, 8, 27, 19 has nine inversions, so the sort makes nine shifts.
    await expect(viz.getByText(/and 9 shifts\. The number of shifts equals the number of inversions/)).toBeVisible();
  });

  test("lesson completion persists across reloads and sign-out, and moves the module's progress", async ({ page }) => {
    const lesson = "/learn/lessons/insertion-sort";
    await page.goto(lesson);

    // Start from a known state so the test can be re-run.
    const undo = page.getByRole("button", { name: "Mark as not complete" });
    if (await undo.isVisible()) {
      await undo.click();
      await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
    }

    await page.goto("/learn/modules/correctness-and-cost");
    await expect(page.getByText("5 of 7 done")).toBeVisible();

    await page.goto(lesson);
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await signOut(page);
    await signIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    // With every lesson done, the next step is the earliest quiz not yet passed: the first
    // Python assessment, which this student has not taken.
    await expect(page.getByText(/Next quiz · Python Module P1/i)).toBeVisible();
    await page.goto(lesson);
    await expect(page.getByText("Lesson complete")).toBeVisible();
    await page.goto("/learn/modules/correctness-and-cost");
    await expect(page.getByText("6 of 7 done")).toBeVisible();

    // Restore the seeded state.
    await page.goto(lesson);
    await page.getByRole("button", { name: "Mark as not complete" }).click();
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
  });

  test("a quiz is graded on the server, explained, and recorded in the history", async ({ page }) => {
    await page.goto("/learn/quizzes/correctness-and-cost-quiz");
    await expect(page.getByRole("heading", { level: 1, name: "Assessment: correctness and cost" })).toBeVisible();
    await expect(page.getByText("Question 1 of 8")).toBeVisible();
    const history = page.getByRole("region", { name: "Attempt history" });
    const attemptsBefore = await history.getByRole("row").count();

    // The page must not contain the answer key before submission.
    expect(await page.content()).not.toContain("at least halves the candidate range");

    const next = () => page.getByRole("button", { name: "Save answer and continue" }).click();

    await page.getByRole("radio").nth(1).check(); // Theta(log n): correct
    await next();
    await expect(page.getByText("Question 2 of 8")).toBeVisible();
    await page.getByRole("radio", { name: "False" }).check(); // correct
    await next();
    await expect(page.getByText("Question 3 of 8")).toBeVisible();
    await page.getByLabel("Your answer").fill("  TEN "); // correct, in a different case with spaces
    await next();
    await expect(page.getByText("Question 4 of 8")).toBeVisible();
    await page.getByRole("checkbox").nth(0).check(); // incomplete selection: scores zero of two
    await next();
    await expect(page.getByText("Question 5 of 8")).toBeVisible();
    await page.getByRole("radio").nth(2).check(); // decreasing order: correct
    await next();
    await expect(page.getByText("Question 6 of 8")).toBeVisible();
    await page.getByRole("radio").nth(1).check(); // Theta(n^2): correct
    await next();
    await expect(page.getByText("Question 7 of 8")).toBeVisible();
    await page.getByLabel("Your answer").fill("249"); // wrong: the worst case is 250
    await next();
    await expect(page.getByText("Question 8 of 8")).toBeVisible();
    await page.getByRole("button", { name: "Review answers" }).click(); // left unanswered

    await expect(page.getByText("You have left 1 question unanswered")).toBeVisible();
    await page.getByRole("button", { name: "Submit quiz" }).click();

    // Five one-point questions right; the two-point question, question 7 and question 8 score zero.
    await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
    await expect(page.getByText("5 of 9 points")).toBeVisible();
    await expect(page.getByText("56%", { exact: true })).toBeVisible();
    await expect(page.getByText("Not passed", { exact: true })).toBeVisible();
    await expect(page.getByText(/at least halves the candidate range/)).toBeVisible();
    await expect(page.getByText("No answer")).toBeVisible();

    await page.getByRole("link", { name: "Try again" }).click();
    await expect(page.getByText("Question 1 of 8")).toBeVisible();
    await expect(history.getByRole("row")).toHaveCount(attemptsBefore + 1);
  });

  test("a project can be saved as a draft and needs a link to be submitted", async ({ page }) => {
    await page.goto("/learn/projects/measuring-growth");
    await expect(page.getByRole("heading", { level: 1, name: "Measure, model, explain" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grading rubric" })).toBeVisible();
    await expect(page.getByRole("link", { name: /the timeit module/ })).toBeVisible();

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

    await link.fill(original || "https://github.com/example/growth-study");
    await page.getByRole("button", { name: /Update submission|Submit for review/ }).click();
    await expect(page.getByRole("status")).toContainText("Submitted");
  });

  test("search links to lessons and to coding problems", async ({ page }) => {
    await page.getByRole("search").getByLabel("Search the course").first().fill("lower bound");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/learn\/search\?q=lower\+bound/);
    await expect(page.getByRole("heading", { name: /Practice problems \(\d+\)/ })).toBeVisible();
    await page.getByRole("region", { name: /Practice problems/ }).getByRole("link", { name: /Lower bound/ }).click();
    await expect(page).toHaveURL(/\/learn\/practice\/lower-bound$/);
    await expect(page.getByRole("heading", { level: 1, name: "Lower bound" })).toBeVisible();

    await page.goto("/learn/search?q=insertion");
    await page.getByRole("region", { name: /Lessons/ }).getByRole("link", { name: /Insertion sort/ }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/insertion-sort$/);

    // Planned modules have nothing to open, so they are not results; odd input is harmless.
    await page.goto("/learn/search?q=sliding+window");
    await expect(page.getByRole("link", { name: /Sliding window/ })).toHaveCount(0);
    await page.goto(`/learn/search?q=${encodeURIComponent("<script>alert(1)</script>")}`);
    await expect(page.getByText("No matches")).toBeVisible();
  });

  test("the remaining sections load", async ({ page }) => {
    for (const [path, heading] of [
      ["/learn/curriculum", "Data Structures and Algorithms"],
      ["/learn/practice", "Coding practice"],
      ["/learn/playground", "Python playground"],
      ["/learn/quizzes", /./],
      ["/learn/projects", "Projects and assignments"],
      ["/learn/sessions", "Seminars and office hours"],
      ["/learn/resources", "Course library"],
      ["/learn/feedback", "Feedback from your instructor"],
      ["/learn/progress", "Your progress"],
      ["/learn/settings", "Profile and settings"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading }), path).toBeVisible();
    }
    // Staff-only settings are not offered to a student.
    await expect(page.getByRole("heading", { name: "Public profile" })).toHaveCount(0);
  });
});

test.describe("coding practice", () => {
  const problem = "/learn/practice/is-sorted";
  const solution = ["def is_sorted(items: list[int]) -> bool:", "    for i in range(1, len(items)):", "        if items[i - 1] > items[i]:", "            return False", "    return True", ""].join("\n");

  async function clearPractice() {
    await admin.from("code_submissions").delete().eq("user_id", await studentId());
  }

  test.beforeEach(async ({ page }) => {
    await clearPractice();
    await signIn(page, STUDENT);
  });
  test.afterAll(clearPractice);

  test("the practice list can be browsed, searched and filtered", async ({ page }) => {
    await page.goto("/learn/practice");
    await expect(page.getByRole("heading", { level: 1, name: "Coding practice" })).toBeVisible();
    await expect(page.getByText(/Sample-test results are local feedback: there is no official grading\./)).toBeVisible();
    await expect(page.getByText(/Submitting a solution unlocks the editorial for self-review\. Submission does not mean the solution is correct\./)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Showing all 14 problems, in course order.");
    await expect(page.getByRole("main").getByRole("listitem").getByText("Not attempted", { exact: true })).toHaveCount(14);
    // Problems are labelled with their module's display number.
    await expect(page.getByText(/^Python Module P1 · /).first()).toBeVisible();
    await expect(page.getByText(/^DSA Module 1 · /).first()).toBeVisible();

    await page.getByLabel("Difficulty").selectOption({ label: "Warm-up" });
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("status")).toHaveText("Showing 5 of 14 problems.");
    await expect(page.getByRole("link", { name: "First occurrence" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Is it sorted?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lower bound" })).toHaveCount(0);

    // Clearing resets the list and the filter controls themselves.
    await page.getByRole("link", { name: "Clear" }).click();
    await expect(page).toHaveURL(/\/learn\/practice$/);
    await expect(page.getByRole("status")).toHaveText("Showing all 14 problems, in course order.");
    await expect(page.getByLabel("Difficulty")).toHaveValue("all");
    await page.getByLabel("Search", { exact: true }).fill("square root");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("status")).toHaveText("Showing 1 of 14 problems.");
    await expect(page.getByRole("link", { name: "Integer square root" })).toBeVisible();

    await page.getByLabel("Search", { exact: true }).fill("no such problem anywhere");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByText("No problems match")).toBeVisible();
  });

  test("a student writes a solution, saves a draft, submits for self-review and reads the editorial", async ({ page }) => {
    await page.goto("/learn/practice");
    await page.getByRole("link", { name: "Is it sorted?" }).click();
    await expect(page).toHaveURL(/\/learn\/practice\/is-sorted$/);

    // The problem: statement, constraints, examples, and the status.
    await expect(page.getByRole("heading", { level: 1, name: "Is it sorted?" })).toBeVisible();
    await expect(page.getByText("Warm-up", { exact: true })).toBeVisible();
    await expect(page.getByText("Not attempted", { exact: true })).toBeVisible();
    await expect(page.getByText(/Lists of length 0 and 1 are sorted/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Constraints" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Examples" })).toBeVisible();
    await expect(page.getByText(/^is_sorted\(\[/).first()).toBeVisible();

    // No editorial, reference solution or hidden test reaches the page before an attempt.
    await expect(page.getByText(/Submitting a solution unlocks the editorial for self-review\. Submission does not mean the solution is correct\. Run the sample tests first/)).toBeVisible();
    const before = await page.content();
    expect(before).not.toContain("Order between neighbours implies");
    expect(before).not.toContain("order between neighbours implies");
    expect(before).not.toContain("hidden_tests");

    // Hints are revealed one at a time.
    await expect(page.getByText(/^Hint 1\./)).toHaveCount(0);
    await page.getByRole("button", { name: "Show the first hint" }).click();
    await expect(page.getByText(/You do not need to compare every pair of positions/)).toBeVisible();
    await expect(page.getByText(/^Hint 2\./)).toHaveCount(0);
    await page.getByRole("button", { name: "Show hint 2 of 3" }).click();
    await expect(page.getByText(/far apart/)).toBeVisible();

    // The editor starts with the starter code and behaves like a code editor.
    const editor = page.getByLabel("Python solution");
    await expect(editor).toHaveValue(/def is_sorted\(items: list\[int\]\) -> bool:/);
    await fillEditor(editor, "def f():");
    await editor.press("End");
    await editor.press("Enter");
    await editor.pressSequentially("return 1");
    await expect(editor).toHaveValue("def f():\n    return 1");
    await editor.press("Enter");
    await editor.press("Tab");
    await expect(editor).toHaveValue("def f():\n    return 1\n        ");
    await editor.press("Shift+Tab");
    await expect(editor).toHaveValue("def f():\n    return 1\n    ");
    // Escape then Tab leaves the editor, so it is not a keyboard trap.
    await editor.press("Escape");
    await editor.press("Tab");
    await expect(editor).not.toBeFocused();

    // The starter code cannot be submitted as an attempt.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset to starter code" }).click();
    await expect(editor).toHaveValue(/One pass over adjacent pairs is enough/);
    await page.getByRole("button", { name: "Submit for self-review" }).click();
    await expect(page.getByText(/This is still the starter code/)).toBeVisible();
    await expect(page.getByText("You have not submitted an attempt yet", { exact: false })).toBeVisible();

    // Run code: the visible sample tests, in the browser. The starter returns True for everything,
    // so it passes the two sorted samples and fails the unsorted one.
    const output = page.locator("[data-python-output]");
    const runState = page.locator("[data-run-state]");
    await expect(page.getByText("Local sample-test results: not official grading.")).toBeVisible();
    await expect(runState).toHaveAttribute("data-run-state", "ready");
    await expect(page.getByRole("button", { name: "Stop execution" })).toBeDisabled();
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(runState).toHaveAttribute("data-run-state", "failed", { timeout: 120_000 }); // the first run loads the runtime
    await expect(output.locator("[data-test-summary]")).toHaveText("2 of 3 sample tests passed, 1 failed.");
    const failing = output.locator('[data-test-status="failed"]');
    await expect(failing).toHaveCount(1);
    await expect(failing).toContainText("is_sorted([1, 3, 2])");
    await expect(failing).toContainText("Expected");
    await expect(failing).toContainText("False");
    await expect(failing).toContainText("Actual");
    await expect(failing).toContainText("True");

    // A wrong function name is explained, not swallowed.
    await fillEditor(editor, "def sorted_check(items):\n    return True\n");
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(output.getByText(/does not define a function named is_sorted\(\)/).first()).toBeVisible();
    await expect(output.locator("[data-test-summary]")).toHaveText("0 of 3 sample tests passed, 3 stopped with an error.");

    // A syntax error runs no test and points at the line.
    await fillEditor(editor, "def is_sorted(items)\n    return True\n");
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(output.getByText(/SyntaxError on line 1/)).toBeVisible();
    await expect(output.getByText("no sample test was run", { exact: false })).toBeVisible();

    // An endless loop is stopped on request, and the runtime recovers for the next run.
    await fillEditor(editor, "def is_sorted(items):\n    while True:\n        pass\n");
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(runState).toHaveAttribute("data-run-state", "running");
    await page.getByRole("button", { name: "Stop execution" }).click();
    await expect(runState).toHaveAttribute("data-run-state", "cancelled");
    await expect(output).toContainText("Stopped at your request");

    await fillEditor(editor, solution);
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(runState).toHaveAttribute("data-run-state", "completed", { timeout: 60_000 });
    await expect(output.locator("[data-test-summary]")).toHaveText("3 of 3 sample tests passed.");
    await expect(page.getByText(/That is encouraging, not proof/)).toBeVisible();
    // Passing the samples changes nothing on the server: the problem is still not attempted.
    await expect(page.getByText("Not attempted", { exact: true })).toBeVisible();

    // Save a draft; it survives a reload and shows in the status.
    await fillEditor(editor, solution);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draft saved. It has not been submitted." })).toBeVisible();
    await expect(page.getByText("All changes saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Python solution")).toHaveValue(solution);
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(page.getByText(/Run the sample tests first and make a real attempt/)).toBeVisible(); // a draft does not unlock the editorial

    // Submit for self-review: recorded in the history, never called correct.
    await page.getByRole("button", { name: "Submit for self-review" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Submitted for self-review" })).toContainText("submission does not mean the solution is correct");
    await expect(page.getByText("Submitted for self-review", { exact: true })).toBeVisible();
    await expect(page.getByText("1 attempt recorded")).toBeVisible();
    const history = page.getByRole("region", { name: "Submission history" });
    await expect(history.getByText("Attempt 1", { exact: true })).toBeVisible();
    await expect(history.getByText(/not graded/).first()).toBeVisible();
    await history.getByText("Attempt 1", { exact: true }).click();
    await expect(history.locator("pre")).toHaveText(solution);
    for (const claim of [/\bAccepted\b/, /\bCorrect\b/, /Automatically verified/, /\bVerified\b/, /\bSolved\b/]) {
      await expect(page.getByRole("main").getByText(claim)).toHaveCount(0);
    }

    // The editorial is now open.
    await page.getByText("Read the editorial and the reference solution").click();
    await expect(page.getByText(/Unlocked because you have submitted an attempt\. Submitting a solution unlocks the editorial for self-review\. Submission does not mean the solution is correct\./)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Why it is correct" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reference solution" })).toBeVisible();

    // An identical resubmission is refused; a changed one is recorded as attempt 2.
    await page.getByRole("button", { name: "Submit for self-review" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "identical to your last submitted attempt" })).toBeVisible();
    await expect(history.getByText(/^Attempt \d+$/)).toHaveCount(1);
    await fillEditor(page.getByLabel("Python solution"), solution.replace("return True", "return True  # second attempt"));
    await page.getByRole("button", { name: "Submit for self-review" }).click();
    await expect(history.getByText("Attempt 2", { exact: true })).toBeVisible();
    await expect(page.getByText("2 attempts recorded")).toBeVisible();

    // The list and the dashboard reflect it; completion does not count practice.
    await page.goto("/learn/practice");
    const row = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Is it sorted?" }) });
    await expect(row.getByText("Submitted for self-review")).toBeVisible();
    await expect(row.getByText("2 attempts")).toBeVisible();
    await page.getByLabel("Status").selectOption({ label: "Submitted for self-review" });
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("status")).toHaveText("Showing 1 of 14 problems.");
    await page.goto("/learn");
    await expect(page.getByText(/1 of 14\s+problems submitted for self-review/)).toBeVisible();

    // Another problem's editorial is still closed.
    await page.goto("/learn/practice/lower-bound");
    await expect(page.getByText(/Run the sample tests first and make a real attempt/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reference solution" })).toHaveCount(0);

    await signOut(page);
    await page.goto(problem);
    await expect(page).toHaveURL(/\/learn\/login/);
  });

  test("code is shown as text, never interpreted as markup", async ({ page }) => {
    await page.goto(problem);
    const hostile = 'print("<img src=x onerror=window.__pwned=1>")\n# </textarea><script>window.__pwned=1</script>\n';
    await fillEditor(page.getByLabel("Python solution"), hostile);
    await page.getByRole("button", { name: "Submit for self-review" }).click();
    const history = page.getByRole("region", { name: "Submission history" });
    await history.getByText("Attempt 1", { exact: true }).click();
    await expect(history.locator("pre")).toHaveText(hostile);
    await page.reload();
    await expect(page.getByLabel("Python solution")).toHaveValue(hostile);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await expect(page.locator("img[src='x']")).toHaveCount(0);
  });

  test("a problem that does not exist shows the not-found page, not an error", async ({ page }) => {
    await page.goto("/learn/practice/no-such-problem");
    await expect(page.getByRole("heading", { level: 1, name: "That page is not part of your course" })).toBeVisible();
    await expect(page.getByLabel("Python solution")).toHaveCount(0);
  });
});

test.describe("running Python in the browser", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT);
  });

  const finished = (page: Page) =>
    expect(page.locator("[data-run-state]").first()).not.toHaveAttribute("data-run-state", /loading|running/, { timeout: 120_000 });

  test("the playground runs code, reports errors, stops endless loops and recovers", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });

    await page.goto("/learn/playground");
    await expect(page.getByRole("heading", { level: 1, name: "Python playground" })).toBeVisible();
    await expect(page.getByText(/Nothing you run here is sent to the server, saved or graded/)).toBeVisible();
    const editor = page.getByLabel("Python code");
    const output = page.locator("[data-python-output]");
    const state = page.locator("[data-run-state]");
    const run = page.getByRole("button", { name: "Run code" });

    // The first example runs as it stands. The first run downloads and starts the runtime.
    await expect(state).toHaveAttribute("data-run-state", "ready");
    await run.click();
    await expect(state).toHaveAttribute("data-run-state", "completed", { timeout: 120_000 });
    await expect(output).toContainText("7 <class 'int'>");
    await expect(output).toContainText("Execution time");

    // Each starter example runs and prints something.
    const examples = page.getByLabel("Example");
    const titles = await examples.locator("option").allInnerTexts();
    expect(titles).toEqual(["Variables and types", "Lists", "Dictionaries", "Loops", "Functions", "Recursion", "Linear search", "Binary search"]);
    for (const title of titles.slice(1)) {
      await examples.selectOption({ label: title });
      await run.click();
      await finished(page);
      await expect(state, title).toHaveAttribute("data-run-state", "completed");
      await expect(output.getByLabel("Standard output"), title).not.toBeEmpty();
    }
    await expect(output).toContainText("found at index 6"); // the last example: binary search

    // Standard output and standard error are shown separately.
    await fillEditor(editor, 'import sys\nprint("to stdout")\nprint("to stderr", file=sys.stderr)\n');
    await run.click();
    await finished(page);
    await expect(output.getByLabel("Standard output")).toHaveText("to stdout");
    await expect(output.getByLabel("Standard error")).toHaveText("to stderr");

    // Errors: type, line, a plain explanation, and a traceback limited to the student's code.
    for (const [code, type, line] of [
      ["def f(:\n    pass\n", "SyntaxError", 1],
      ["x = 1\nprint(y)\n", "NameError", 2],
      ['total = 1 + "a"\n', "TypeError", 1],
      ["items = [1, 2, 3]\n\nprint(items[5])\n", "IndexError", 3],
      ['n = int("abc")\n', "ValueError", 1],
      ["assert 1 + 1 == 3\n", "AssertionError", 1],
    ] as const) {
      await fillEditor(editor, code);
      await run.click();
      await finished(page);
      await expect(state, type).toHaveAttribute("data-run-state", "failed");
      await expect(output.getByRole("alert"), type).toContainText(`${type} on line ${line}`);
      await expect(output.getByLabel("Traceback"), type).toContainText(type);
      await expect(output.getByLabel("Traceback"), type).not.toContainText(/pyodide|handle_request|_execute/);
    }

    // An endless loop is stopped automatically after the time limit...
    await fillEditor(editor, "count = 0\nwhile True:\n    count += 1\n");
    await run.click();
    await expect(state).toHaveAttribute("data-run-state", "running");
    await expect(run).toBeDisabled(); // no overlapping runs
    await expect(state).toHaveAttribute("data-run-state", "timed_out", { timeout: 15_000 });
    await expect(output).toContainText("Stopped after 5 seconds");

    // ...and the next run works, on a fresh worker.
    await fillEditor(editor, "print(6 * 7)\n");
    await run.click();
    await expect(state).toHaveAttribute("data-run-state", "completed", { timeout: 60_000 });
    await expect(output.getByLabel("Standard output")).toHaveText("42");

    // Stop execution ends a run at once.
    await fillEditor(editor, "while True:\n    pass\n");
    await run.click();
    await expect(state).toHaveAttribute("data-run-state", "running");
    await page.getByRole("button", { name: "Stop execution" }).click();
    await expect(state).toHaveAttribute("data-run-state", "cancelled");

    // A flood of output is cut off instead of freezing the page.
    await fillEditor(editor, 'for i in range(1000000):\n    print("x" * 100)\n');
    await run.click();
    await finished(page);
    await expect(output).toContainText("The output was cut off");

    // Repeated runs keep working, and state does not leak from one run to the next.
    await fillEditor(editor, "secret = 41\nprint(secret + 1)\n");
    await run.click();
    await finished(page);
    await expect(output.getByLabel("Standard output")).toHaveText("42");
    await fillEditor(editor, "print(secret)\n");
    await run.click();
    await finished(page);
    await expect(output.getByRole("alert")).toContainText("NameError");

    // Reset puts the chosen example back.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(editor).toHaveValue(/def binary_search/);

    expect(violations, "content security policy violations").toEqual([]);
  });

  test("code running in the worker cannot reach the application, other hosts, or eval", async ({ page }) => {
    await page.goto("/learn/playground");
    const probe = [
      "import js",
      "def get(url):",
      "    try:",
      "        request = js.XMLHttpRequest.new()",
      '        request.open("GET", url, False)',
      "        request.send()",
      '        return "ALLOWED"',
      "    except BaseException:",
      '        return "BLOCKED"',
      'print("page", get("/learn"))',
      'print("settings", get("/learn/settings"))',
      'print("signout", get("/auth/signout"))',
      `print("database", get("${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/"))`,
      'print("elsewhere", get("https://example.com/"))',
      'print("runtime", get("/pyodide/VERSION"))',
      "for name, attempt in [",
      '    ("eval", lambda: js.eval("1 + 1")),',
      '    ("function", lambda: js.Function.new("return 1")()),',
      '    ("import", lambda: js.importScripts("/learn")),',
      '    ("cookie", lambda: js.document.cookie),',
      "]:",
      "    try:",
      "        attempt()",
      '        print(name, "ALLOWED")',
      "    except BaseException:",
      '        print(name, "BLOCKED")',
      "",
    ].join("\n");
    await fillEditor(page.getByLabel("Python code"), probe);
    await page.getByRole("button", { name: "Run code" }).click();
    await finished(page);
    const text = await page.locator("[data-python-output]").getByLabel("Standard output").innerText();
    expect(text.trim().split("\n")).toEqual([
      "page BLOCKED",
      "settings BLOCKED",
      "signout BLOCKED",
      "database BLOCKED",
      "elsewhere BLOCKED",
      "runtime ALLOWED",
      "eval BLOCKED",
      "function BLOCKED",
      "import BLOCKED",
      "cookie BLOCKED",
    ]);
  });

  test("the worker is served with its own narrow policy, and the page policy is not weakened", async ({ page, request }) => {
    const worker = await request.get("/pyodide-worker");
    expect(worker.headers()["content-type"]).toContain("text/javascript");
    const policy = worker.headers()["content-security-policy"] ?? "";
    expect(policy).toMatch(/^default-src 'none'; script-src (http:\/\/localhost:3000\/pyodide\/ ?)+ 'wasm-unsafe-eval'; connect-src (http:\/\/localhost:3000\/pyodide\/ ?)+$/);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(await worker.text()).not.toMatch(/cdn|jsdelivr|https?:\/\//);

    const response = await page.goto("/learn/playground");
    const pagePolicy = response?.headers()["content-security-policy"] ?? "";
    expect(pagePolicy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic';/);
    expect(pagePolicy).not.toContain("unsafe-eval");
    expect(pagePolicy).not.toContain("wasm-unsafe-eval");
    expect(pagePolicy).toContain("connect-src 'self';");
  });

  test("Python lessons are open, numbered P1 and P2, and their examples run in the page", async ({ page }) => {
    await page.goto("/learn/modules/python-essentials");
    await expect(page.getByText(/Phase 1: Python foundations · Python Module P1/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practice problems" })).toBeVisible();
    await page.getByRole("link", { name: /Values, variables and data types/ }).first().click();
    await expect(page).toHaveURL(/\/learn\/lessons\/values-variables-and-types$/);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Python Module P1: Python essentials");
    await expect(page.getByText("Lesson 1 of 6")).toBeVisible();
    for (const heading of ["1. Motivation", "4. Syntax and semantics", "6. Try it", "7. Common mistakes", "9. Check your understanding", "10. Summary"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    // The runnable example: run it, change it, run again, reset.
    const snippet = page.getByRole("region", { name: "Runnable Python example" });
    await expect(snippet).toHaveCount(1);
    await snippet.getByRole("button", { name: "Run code" }).click();
    await expect(snippet.locator("[data-run-state]")).toHaveAttribute("data-run-state", "completed", { timeout: 120_000 });
    await expect(snippet.getByLabel("Standard output")).toContainText("count is now 8");
    const code = snippet.getByLabel("Python example");
    await code.fill('print("changed by the student", 2 ** 10)\n');
    await snippet.getByRole("button", { name: "Run code" }).click();
    await expect(snippet.getByLabel("Standard output")).toHaveText("changed by the student 1024");
    await snippet.getByRole("button", { name: "Reset" }).click();
    await expect(code).toHaveValue(/count = 7/);

    // Lesson navigation runs through the module in order and into the next one.
    await page.getByRole("navigation", { name: "Lesson navigation" }).getByRole("link", { name: /Operators and expressions/ }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/operators-and-expressions$/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await page.goto("/learn/lessons/strings-and-input-output");
    await expect(page.getByText("Lesson 6 of 6")).toBeVisible();
    await page.goto("/learn/lessons/efficient-python-functions");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Python Module P2");
    await expect(page.getByRole("region", { name: "Runnable Python example" })).toHaveCount(1);

    // The Python assessments and projects are available through the existing pages.
    await page.goto("/learn/quizzes/python-essentials-quiz");
    await expect(page.getByRole("heading", { level: 1, name: "Assessment: Python essentials" })).toBeVisible();
    await expect(page.getByText("Question 1 of 10")).toBeVisible();
    await page.goto("/learn/projects/gradebook");
    await expect(page.getByRole("heading", { level: 1, name: "A gradebook built from collections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grading rubric" })).toBeVisible();
  });

  test("a Python practice problem runs its sample tests, and local results are never recorded", async ({ page }) => {
    await page.goto("/learn/practice/sum-of-digits");
    await expect(page.getByText(/^Python Module P1 · /)).toBeVisible();
    const output = page.locator("[data-python-output]");
    const state = page.locator("[data-run-state]");
    await fillEditor(page.getByLabel("Python solution"), "def digit_sum(n):\n    total = 0\n    while n > 0:\n        total += n % 10\n        n //= 10\n    return total\n");
    await page.getByRole("button", { name: "Run code" }).click();
    await expect(state).toHaveAttribute("data-run-state", "completed", { timeout: 120_000 });
    await expect(output.locator("[data-test-summary]")).toHaveText("3 of 3 sample tests passed.");
    await expect(output.locator('[data-test-status="passed"]')).toHaveCount(3);
    await expect(output).toContainText("digit_sum(4729)");

    // Nothing was saved by running: no draft, no attempt, and the editorial is still locked.
    await page.reload();
    await expect(page.getByText("Not attempted", { exact: true })).toBeVisible();
    await expect(page.getByText("No draft saved yet")).toBeVisible();
    await expect(page.getByLabel("Python solution")).toHaveValue(/# n % 10 is the last digit/);
    await expect(page.getByText(/Run the sample tests first and make a real attempt/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reference solution" })).toHaveCount(0);
    const { count } = await admin.from("code_submissions").select("id", { count: "exact", head: true }).eq("user_id", await studentId());
    expect(count).toBe(0);
  });
});

test.describe("private course files", () => {
  const objectPath = `e2e/notes-${Date.now()}.txt`;
  const stored = `data-structures-and-algorithms/${objectPath}`;

  test.beforeAll(async () => {
    const { error } = await admin.storage.from("course-files").upload(stored, "private course notes", { contentType: "text/plain" });
    expect(error, "upload fixture to the private bucket").toBeNull();
  });
  test.afterAll(async () => {
    await admin.storage.from("course-files").remove([stored]);
  });

  test("an enrolled student gets a short-lived signed link; visitors and missing files get nothing", async ({ page, request }) => {
    // Without a session: sent to the login page, and the bucket has no public address.
    const anonymous = await request.get(`/learn/files/${objectPath}`, { maxRedirects: 0 });
    expect(anonymous.status()).toBe(307);
    expect(anonymous.headers().location).toContain("/learn/login");
    const direct = await request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/course-files/${stored}`);
    expect(direct.ok()).toBe(false);

    await signIn(page, STUDENT);
    const response = await page.request.get(`/learn/files/${objectPath}`, { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const location = response.headers().location ?? "";
    expect(location).toContain(`/storage/v1/object/sign/course-files/${stored}`);
    expect(location).toContain("token=");
    expect(await (await page.request.get(location)).text()).toBe("private course notes");

    expect((await page.request.get("/learn/files/e2e/no-such-file.txt", { maxRedirects: 0 })).status()).toBe(404);
    expect((await page.request.get("/learn/files/..%2F..%2Fsecret", { maxRedirects: 0 })).status()).toBe(404);
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
    await expect(drawer.getByRole("link", { name: "Practice" })).toBeVisible();
    await drawer.getByRole("link", { name: "Curriculum" }).click();
    await expect(page).toHaveURL(/\/learn\/curriculum$/);
    await expect(drawer).toBeHidden();

    await page.goto("/learn/lessons/binary-search");
    await page.getByRole("button", { name: "Course contents" }).click();
    const contents = page.getByRole("dialog", { name: "Course contents" });
    await expect(contents.getByRole("link", { name: /Problems, algorithms and correctness/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(contents).toBeHidden();

    for (const path of [
      "/learn",
      "/learn/curriculum",
      "/learn/lessons/binary-search",
      "/learn/lessons/insertion-sort",
      "/learn/practice",
      "/learn/practice/lower-bound",
      "/learn/playground",
      "/learn/lessons/lists-and-tuples",
      "/learn/projects/measuring-growth",
      "/",
    ]) {
      await page.goto(path);
      const { overflow, culprits } = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const culprits: string[] = [];
        // Elements that stick out of the viewport and are not inside something that clips or scrolls.
        for (const element of Array.from(document.querySelectorAll("body *"))) {
          const box = element.getBoundingClientRect();
          if (box.width === 0 || box.right <= width + 1) continue;
          // An absolutely positioned element is clipped only from its containing block upwards.
          let position = getComputedStyle(element).position;
          let contained = false;
          for (let parent = element.parentElement; parent && position !== "fixed"; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (position === "absolute" && style.position === "static") continue;
            position = style.position;
            if (style.overflowX !== "visible") {
              contained = true;
              break;
            }
          }
          if (contained) continue;
          const name = `${element.tagName.toLowerCase()}.${String(element.getAttribute("class") ?? "").slice(0, 60)}`;
          culprits.push(`${name} right=${Math.round(box.right)} width=${Math.round(box.width)} position=${getComputedStyle(element).position}`);
        }
        return { overflow: document.documentElement.scrollWidth - width, culprits: [`viewport=${width}`, ...culprits.slice(0, 8)] };
      });
      expect(overflow, `horizontal overflow on ${path}: ${culprits.join(" | ")}`).toBeLessThanOrEqual(1);
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
    await expect(page.getByRole("link", { name: /Measure, model, explain/ }).first()).toBeVisible();

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

  test("the instructor area manages the DSA course, and staff can edit the public profile", async ({ page }) => {
    await signIn(page, INSTRUCTOR);
    await page.goto("/admin/content");
    await expect(page.getByRole("heading", { level: 2, name: "Data Structures and Algorithms" })).toBeVisible();

    await page.goto("/learn/settings");
    const form = page.getByRole("region", { name: "Public profile" });
    await expect(form).toBeVisible();
    const links = form.getByLabel("Links");
    const original = await links.inputValue();
    await links.fill("Trap | javascript:alert(1)");
    await form.getByRole("button", { name: "Save public profile" }).click();
    await expect(form.getByText(/Line 1: the link must be a full https:\/\/ address/)).toBeVisible();
    await links.fill(original);
    await form.getByRole("button", { name: "Save public profile" }).click();
    await expect(form.getByRole("status")).toContainText("Public profile saved");
  });
});

test.describe("public website", () => {
  test("the landing page presents DSA Academy and an honest curriculum", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) errors.push(message.text());
    });

    const response = await page.goto("/");
    expect(response?.headers()["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    await expect(page).toHaveTitle("Data Structures and Algorithms · DSA Academy");
    await expect(page.getByRole("banner").getByRole("link", { name: "DSA Academy" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Data Structures and Algorithms" })).toBeVisible();
    await expect(page.getByText("Learn Data Structures and Algorithms, from Foundations to Mastery.").first()).toBeVisible();
    expect(await page.content()).not.toMatch(/Isocline|Scientific Machine Learning|Helena Voss|support@example\.com/);

    await expect(page.getByRole("heading", { name: "The learning path" })).toBeVisible();
    await expect(page.getByText(/8 phases · 3 modules available · 31 modules planned/)).toBeVisible();
    await expect(page.getByText("3 of 34")).toBeVisible();
    // The published module lists its lessons; a planned one is labelled and lists none.
    await expect(page.getByText("Available", { exact: true })).toHaveCount(3);
    // Python preparation and core modules are numbered separately.
    await expect(page.getByText("Python Module P1", { exact: true })).toBeVisible();
    await expect(page.getByText("Python Module P2", { exact: true })).toBeVisible();
    await page.getByText("Phase 2", { exact: true }).click();
    await expect(page.getByText("DSA Module 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/Binary search/).first()).toBeVisible();
    await page.getByText("Phase 3", { exact: true }).click();
    const planned = page.locator("div").filter({ has: page.getByRole("heading", { level: 3, name: "Two pointers", exact: true }) }).last();
    await expect(planned.getByText("Planned", { exact: true })).toBeVisible();
    await expect(planned.getByText("DSA Module 5", { exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Adebanji Adelowo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Frequently asked" })).toBeVisible();
    expect(errors, "content security policy violations").toEqual([]);

    await page.getByRole("link", { name: "Student login" }).first().click();
    await expect(page).toHaveURL(/\/learn\/login$/);
  });

  test("the contact form validates input, stores a message, and is rate limited", async ({ page }) => {
    // Earlier runs from this machine must not count against this one.
    await admin.from("rate_limit_hits").delete().like("bucket", "contact:%");
    const email = `playwright-${Date.now()}@example.com`;

    const send = async (message: string) => {
      await page.goto("/contact");
      await page.getByLabel("Your name").fill("Playwright Test");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Message").fill(message);
      await page.getByRole("button", { name: "Send message" }).click();
    };

    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();

    for (let attempt = 1; attempt <= 3; attempt++) {
      await send(`This message was sent by the automated end-to-end test, number ${attempt}.`);
      await expect(page.getByRole("status"), `message ${attempt}`).toContainText("Your message has reached the course team");
    }
    // The fourth message from the same email address within the hour is refused.
    await send("This fourth message should be refused by the rate limiter.");
    await expect(page.getByRole("alert").filter({ hasText: "Too many messages" })).toBeVisible();

    const { count } = await admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email);
    expect(count).toBe(3);
    await admin.from("contact_messages").delete().eq("email", email);
    await admin.from("rate_limit_hits").delete().like("bucket", "contact:%");
  });
});

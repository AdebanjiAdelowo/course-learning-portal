/**
 * Keyboard and automated accessibility checks of the three Phase 3 visualizers, on the real published
 * lessons, for a temporary student. This is not a screen-reader pass: announcements are checked
 * through the DOM (live regions, alerts and names), not with assistive technology.
 */
import { createHash, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";
import { visualizerAccessibilitySuite } from "./support/visualizer-a11y";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const email = `e2e-a11y-${randomUUID().slice(0, 8)}@example.com`;
const password = `Fixture-${randomUUID()}!`;
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

for (const viz of VISUALIZERS) visualizerAccessibilitySuite({ name: viz.name, invalid: viz.invalid, url: () => `/learn/lessons/${viz.lesson}` });

/**
 * Hidden tests, reference solutions and editorials of every published coding problem stay out of
 * the client bundle and out of every payload a student's browser receives before submitting.
 * Uses a temporary student who has completed every published lesson; existing students are unchanged.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const email = `e2e-security-${randomUUID().slice(0, 8)}@example.com`;
const password = `Fixture-${randomUUID()}!`;
let userId = "";
let courseId = "";
let baseline = "";
let slugs: string[] = [];

function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(result.error?.message ?? "Missing fixture data");
  return result.data;
}

async function existingState(): Promise<string> {
  const parts = [must(await admin.from("modules").select("id, slug, position, phase_id, is_published").eq("course_id", courseId).order("id"))];
  for (const table of ["lesson_progress", "quiz_attempts", "submissions", "code_submissions"] as const) {
    const query = admin.from(table).select("*");
    parts.push(must(await (table === "lesson_progress" ? query.order("user_id").order("lesson_id") : query.order("id"))) as never);
  }
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

const read = (slug: string, file: string) => readFileSync(`seed/problems/${slug}/${file}`, "utf8");
const compact = (value: unknown) => JSON.stringify(value);
/** A marker as it may appear raw, or inside a JSON string in a serialized payload. */
const forms = (marker: string) => [marker, JSON.stringify(marker).slice(1, -1)];

/** Text a student may legitimately see for every problem: statements, starters and visible samples. */
function publicCorpus(all: string[]) {
  return all.map((slug) => read(slug, "problem.md") + read(slug, "starter.py") + compact((JSON.parse(read(slug, "tests.json")) as { sample: { args: unknown[] }[] }).sample.map((t) => t.args))).join("\n");
}

/** Strings that would only appear if protected material leaked. */
function markersFor(slug: string, corpus: string) {
  const tests = JSON.parse(read(slug, "tests.json")) as { sample: { args: unknown[] }[]; hidden: { args: unknown[] }[] };
  const solution = read(slug, "solution.py").split("\n").map((line) => line.trim()).filter((line) => line.length > 15 && !line.startsWith("def ") && !corpus.includes(line));
  const editorial = read(slug, "editorial.md").split("\n").map((line) => line.trim()).filter((line) => line.length > 60 && !line.startsWith("#") && !line.startsWith("```") && !corpus.includes(line)).slice(0, 3);
  const hidden = tests.hidden.map((t) => compact(t.args)).filter((signature) => signature.length >= 10 && !corpus.includes(signature));
  return { solution, editorial, hidden, samples: tests.sample.map((t) => compact(t.args)).filter((signature) => signature.length >= 8) };
}

function staticFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? staticFiles(path) : [path];
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error("Security fixtures require local Supabase.");
  courseId = must(await admin.from("courses").select("id").eq("slug", "data-structures-and-algorithms").single()).id;
  const modules = must(await admin.from("modules").select("id").eq("course_id", courseId).eq("is_published", true).not("slug", "like", "e2e-%"));
  slugs = must(await admin.from("coding_problems").select("slug").in("module_id", modules.map((m) => m.id)).eq("is_published", true).order("position")).map((p) => p.slug);
  expect(slugs).toHaveLength(43);
  baseline = await existingState();
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error || !user.data.user) throw new Error(user.error?.message ?? "Missing fixture user");
  userId = user.data.user.id;
  must(await admin.from("enrollments").insert({ user_id: userId, course_id: courseId, status: "active" }).select("id").single());
  // Complete every published lesson for this temporary student only, so no module is locked.
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

test("the client bundle contains no hidden test, reference solution or editorial of any of the 43 problems", async () => {
  const corpus = publicCorpus(slugs);
  const files = staticFiles(".next/static").filter((path) => /\.(js|css|json|txt|html)$/.test(path));
  const bundle = files.map((path) => readFileSync(path, "utf8")).join("\n");
  // Positive control: the scan sees real client code.
  expect(bundle).toContain("Local sample-test results: not official grading.");
  for (const slug of slugs) {
    const { solution, editorial, hidden } = markersFor(slug, corpus);
    expect(solution.length + hidden.length, `${slug} has markers to check`).toBeGreaterThan(0);
    for (const marker of [...solution, ...editorial, ...hidden]) {
      for (const form of forms(marker)) expect(bundle.includes(form), `${slug}: ${marker}`).toBe(false);
    }
  }
});

test("every published practice page delivers its visible samples and nothing protected before a submission", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/learn/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);

  const corpus = publicCorpus(slugs);
  const markers = slugs.map((slug) => ({ slug, ...markersFor(slug, corpus) }));
  const protectedMarkers = markers.flatMap((m) => [...m.solution, ...m.editorial, ...m.hidden].map((marker) => ({ slug: m.slug, marker })));
  const bodies: string[] = [];
  page.on("response", async (response) => {
    const type = response.request().resourceType();
    if (type === "document" || type === "fetch" || type === "xhr") bodies.push(await response.text().catch(() => ""));
  });

  const pages = ["/learn/practice", ...slugs.map((slug) => `/learn/practice/${slug}`)];
  for (const address of pages) {
    bodies.length = 0;
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const delivered = bodies.join("\n") + (await page.content());
    const own = markers.find((m) => address.endsWith(`/${m.slug}`));
    if (own) {
      await expect(page.getByText("Local sample-test results: not official grading.")).toBeVisible();
      await expect(page.getByText("Read the editorial and the reference solution", { exact: true })).toHaveCount(0);
      // Positive control: the visible samples are in the payload, so a leaked hidden case would be too.
      for (const sample of own.samples) expect(delivered.includes(sample) || delivered.includes(JSON.stringify(sample).slice(1, -1)), `${own.slug} sample ${sample}`).toBe(true);
    }
    expect(delivered).not.toContain("hidden_tests");
    expect(delivered).not.toContain("reference_solution");
    for (const { slug, marker } of protectedMarkers) {
      for (const form of forms(marker)) expect(delivered.includes(form), `${address} leaks ${slug}: ${marker}`).toBe(false);
    }
  }
  expect(must(await admin.from("code_submissions").select("id").eq("user_id", userId))).toEqual([]);
});

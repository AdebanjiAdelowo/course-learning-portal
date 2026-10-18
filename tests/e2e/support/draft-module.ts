/**
 * Browser fixtures for an unpublished draft module: copy it into a uniquely named temporary
 * published module, create a temporary enrolled student, and remove both by exact ID afterwards.
 * The draft itself is never published, and existing students are checked to be unchanged.
 */
import { createHash, randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

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

export function draftModuleFixture(sourceSlug: string, label: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
  const prefix = `e2e-${label}-${randomUUID().slice(0, 8)}`;
  const email = `${prefix}@example.com`;
  const password = `Fixture-${randomUUID()}!`;
  const state = {
    prefix,
    lessons: [] as { slug: string; title: string }[],
    problems: [] as { slug: string; sourceSlug: string; samples: number }[],
    questions: [] as Row<"questions">[],
    keys: [] as Row<"question_keys">[],
    quizSlug: "",
    projectSlug: "",
  };
  let userId = "";
  let moduleId = "";
  let courseId = "";
  let baseline = "";

  /** Hash persisted state without logging student records or credentials. */
  async function existingState(): Promise<string> {
    const parts = [];
    parts.push(must(await admin.from("modules").select("id, slug, position, phase_id, is_published").eq("course_id", courseId).order("id")));
    for (const table of ["lesson_progress", "quiz_attempts", "submissions", "code_submissions"] as const) {
      const query = admin.from(table).select("*");
      parts.push(must(await (table === "lesson_progress" ? query.order("user_id").order("lesson_id") : query.order("id"))));
    }
    return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  }

  async function setUp() {
    if (!/^https?:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error("Draft fixtures require local Supabase.");
    courseId = must(await admin.from("courses").select("id").eq("slug", "data-structures-and-algorithms").single()).id;
    baseline = await existingState();
    const source = must(await admin.from("modules").select("*").eq("course_id", courseId).eq("slug", sourceSlug).single());
    expect(source.is_published, `${sourceSlug} must remain an unpublished draft`).toBe(false);
    const last = must(await admin.from("modules").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).single());
    moduleId = must(await admin.from("modules").insert({ ...copy(source), slug: prefix, position: last.position + 1, is_published: true, requires_previous: false, available_from: null }).select("id").single()).id;
    const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (user.error || !user.data.user) throw new Error(user.error?.message ?? "Missing fixture user");
    userId = user.data.user.id;
    must(await admin.from("enrollments").insert({ user_id: userId, course_id: courseId, status: "active" }).select("id").single());
    for (const lesson of must(await admin.from("lessons").select("*").eq("module_id", source.id).order("position"))) {
      const slug = `${prefix}-${lesson.slug}`;
      must(await admin.from("lessons").insert({ ...copy(lesson), module_id: moduleId, slug }).select("id").single());
      state.lessons.push({ slug, title: lesson.title });
    }
    const quiz = must(await admin.from("quizzes").select("*").eq("module_id", source.id).single());
    state.quizSlug = `${prefix}-quiz`;
    const quizId = must(await admin.from("quizzes").insert({ ...copy(quiz), module_id: moduleId, slug: state.quizSlug }).select("id").single()).id;
    state.questions = must(await admin.from("questions").select("*").eq("quiz_id", quiz.id).order("position"));
    state.keys = must(await admin.from("question_keys").select("*").in("question_id", state.questions.map((q) => q.id)));
    for (const question of state.questions) {
      const id = must(await admin.from("questions").insert({ ...copy(question), quiz_id: quizId }).select("id").single()).id;
      const key = state.keys.find((k) => k.question_id === question.id)!;
      must(await admin.from("question_keys").insert({ ...key, question_id: id }).select("question_id").single());
    }
    const project = must(await admin.from("projects").select("*").eq("module_id", source.id).single());
    state.projectSlug = `${prefix}-project`;
    must(await admin.from("projects").insert({ ...copy(project), module_id: moduleId, slug: state.projectSlug }).select("id").single());
    for (const problem of must(await admin.from("coding_problems").select("*").eq("module_id", source.id).order("position"))) {
      const slug = `${prefix}-${problem.slug}`;
      const problemId = must(await admin.from("coding_problems").insert({ ...copy(problem), module_id: moduleId, slug }).select("id").single()).id;
      const solution = must(await admin.from("coding_problem_solutions").select("*").eq("problem_id", problem.id).single());
      must(await admin.from("coding_problem_solutions").insert({ ...solution, problem_id: problemId }).select("problem_id").single());
      state.problems.push({ slug, sourceSlug: problem.slug, samples: (problem.examples as unknown[]).length });
    }
  }

  async function tearDown() {
    if (moduleId) {
      const result = await admin.from("modules").delete().eq("id", moduleId);
      if (result.error) throw result.error;
    }
    if (userId) {
      const result = await admin.auth.admin.deleteUser(userId);
      if (result.error) throw result.error;
    }
    if (baseline) expect(await existingState(), "Existing ordering and student activity must be unchanged after fixture cleanup").toBe(baseline);
    const source = must(await admin.from("modules").select("is_published").eq("course_id", courseId).eq("slug", sourceSlug).single());
    expect(source.is_published, `${sourceSlug} must still be unpublished after the suite`).toBe(false);
  }

  async function signIn(page: Page) {
    await page.goto("/learn/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
  }

  return { state, setUp, tearDown, signIn };
}

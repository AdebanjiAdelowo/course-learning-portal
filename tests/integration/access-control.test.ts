/**
 * Row-level security, migrations and seed data, exercised through the real API with real
 * sessions.
 *
 * These tests sign in as the seeded accounts and try to do things they must not be able to do.
 * Requires a running, seeded local stack: `npm run db:start && npm run seed`.
 *
 * The seed publishes six modules. Tests that need more (a locked module, a draft project
 * submission) create their own fixtures with the service role and remove them afterwards.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_COURSE_SLUG } from "@/config/site";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

type Db = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.SEED_DEMO_PASSWORD ?? "";
const configured = Boolean(url && anonKey && serviceKey && password);

const COURSE_SLUG = DEFAULT_COURSE_SLUG;
const MODULE_SLUG = "correctness-and-cost";
/** Published modules, in course order: the two Python modules, then DSA Modules 1 to 4. */
const PHASE3 = ["recursion-and-induction", "arrays-and-amortised-analysis", "linked-lists"];
const PUBLISHED = ["python-essentials", "python-collections-and-testing", MODULE_SLUG, ...PHASE3];
const QUIZ_SLUG = "correctness-and-cost-quiz";

function client(key: string): Db {
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email: string): Promise<{ db: Db; id: string }> {
  const db = client(anonKey);
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not sign in as ${email}: ${error?.message}. Did you run \`npm run seed\`?`);
  return { db, id: data.user.id };
}

/** Fails loudly when a fixture cannot be created, instead of letting later tests pass vacuously. */
function must<T>(what: string, result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`Fixture "${what}" failed: ${result.error?.message ?? "no row returned"}`);
  }
  return result.data;
}

describe.skipIf(!configured)("row-level security", () => {
  let anon: Db;
  let admin: Db;
  let alice: { db: Db; id: string };
  let bob: { db: Db; id: string };
  let instructor: { db: Db; id: string };
  let courseId: string;
  let moduleId: string;
  /** The seeded project of the published module. */
  let growthProjectId: string;
  /** Content in a published module that is locked for both students (they have one lesson left). */
  let locked: { moduleId: string; lessonId: string; quizId: string; problemId: string; resourceId: string };
  /** An unlocked project with a draft submission by the first student. */
  let open: { projectId: string; draftId: string };
  const problemIds = new Map<string, string>();
  const cleanup: (() => PromiseLike<unknown>)[] = [];

  beforeAll(async () => {
    anon = client(anonKey);
    admin = client(serviceKey);
    [alice, bob, instructor] = await Promise.all([
      signIn("student@example.com"),
      signIn("student2@example.com"),
      signIn("instructor@example.com"),
    ]);
    courseId = must("course", await admin.from("courses").select("id").eq("slug", COURSE_SLUG).single()).id;
    moduleId = must("module", await admin.from("modules").select("id").eq("course_id", courseId).eq("slug", MODULE_SLUG).single()).id;
    growthProjectId = must("project", await admin.from("projects").select("id").eq("course_id", courseId).eq("slug", "measuring-growth").single()).id;
    for (const row of must("problems", await admin.from("coding_problems").select("id, slug").eq("course_id", courseId))) {
      problemIds.set(row.slug, row.id);
    }

    // Leftovers of an interrupted earlier run would collide on slug.
    await admin.from("resources").delete().eq("course_id", courseId).eq("title", "Integration test: locked resource");
    await admin.from("modules").delete().eq("course_id", courseId).eq("slug", "it-locked-module");
    await admin.from("projects").delete().eq("course_id", courseId).eq("slug", "it-open-project");

    const lockedModule = must(
      "locked module",
      await admin
        .from("modules")
        .insert({ course_id: courseId, slug: "it-locked-module", title: "Integration test: locked module", position: 9000, requires_previous: true, is_published: true })
        .select("id")
        .single(),
    );
    cleanup.push(() => admin.from("modules").delete().eq("id", lockedModule.id));
    const lesson = must(
      "locked lesson",
      await admin
        .from("lessons")
        .insert({ course_id: courseId, module_id: lockedModule.id, slug: "it-locked-lesson", title: "Integration test: locked lesson", body_md: "SECRET-LOCKED-BODY", position: 1 })
        .select("id")
        .single(),
    );
    const quiz = must(
      "locked quiz",
      await admin.from("quizzes").insert({ course_id: courseId, module_id: lockedModule.id, slug: "it-locked-quiz", title: "Integration test: locked quiz" }).select("id").single(),
    );
    must("locked question", await admin.from("questions").insert({ quiz_id: quiz.id, position: 1, type: "true_false", prompt_md: "SECRET-LOCKED-QUESTION" }).select("id").single());
    const problem = must(
      "locked problem",
      await admin
        .from("coding_problems")
        .insert({
          course_id: courseId,
          module_id: lockedModule.id,
          slug: "it-locked-problem",
          title: "Integration test: locked problem",
          position: 1,
          statement_md: "SECRET-LOCKED-STATEMENT",
          starter_code: "def f():\n    return 0\n",
        })
        .select("id")
        .single(),
    );
    const resource = must(
      "locked resource",
      await admin
        .from("resources")
        .insert({ course_id: courseId, module_id: lockedModule.id, title: "Integration test: locked resource", url: "https://example.com/locked" })
        .select("id")
        .single(),
    );
    cleanup.push(() => admin.from("resources").delete().eq("id", resource.id));
    locked = { moduleId: lockedModule.id, lessonId: lesson.id, quizId: quiz.id, problemId: problem.id, resourceId: resource.id };

    const project = must(
      "open project",
      await admin.from("projects").insert({ course_id: courseId, module_id: moduleId, slug: "it-open-project", title: "Integration test: open project" }).select("id").single(),
    );
    cleanup.push(() => admin.from("projects").delete().eq("id", project.id));
    const draft = must(
      "draft submission",
      await admin.from("submissions").insert({ project_id: project.id, user_id: alice.id, status: "in_progress", notes: "fixture" }).select("id").single(),
    );
    open = { projectId: project.id, draftId: draft.id };
  });

  afterAll(async () => {
    for (const undo of cleanup.reverse()) await undo();
  });

  describe("migrations and seed data", () => {
    it("resolves the course by its configured slug, and that course is the DSA course", async () => {
      const { data } = await admin.from("courses").select("slug, title, is_published").eq("id", courseId).single();
      expect(data).toEqual({ slug: "data-structures-and-algorithms", title: "Data Structures and Algorithms", is_published: true });
    });

    it("has eight phases in order, and every seeded module belongs to one", async () => {
      const { data: phases } = await admin.from("phases").select("id, slug, position").eq("course_id", courseId).order("position");
      expect(phases!.map((phase) => phase.slug)).toEqual([
        "python-foundations",
        "foundations",
        "linear-structures-and-sorting",
        "hashing-and-trees",
        "graphs",
        "design-techniques",
        "strings-and-advanced-structures",
        "limits-and-synthesis",
      ]);
      expect(phases!.map((phase) => phase.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      const { data: modules } = await admin.from("modules").select("slug, phase_id, position, is_published").eq("course_id", courseId).not("slug", "like", "it-%").order("position");
      expect(modules).toHaveLength(34);
      const phaseIds = new Set(phases!.map((phase) => phase.id));
      expect(modules!.every((mod) => mod.phase_id !== null && phaseIds.has(mod.phase_id))).toBe(true);
      // Module order follows phase order: a module never sits before one from an earlier phase.
      const phasePosition = new Map(phases!.map((phase) => [phase.id, phase.position]));
      const sequence = modules!.map((mod) => phasePosition.get(mod.phase_id!)!);
      expect([...sequence].sort((a, b) => a - b)).toEqual(sequence);
      expect(modules![0]!.slug).toBe("python-essentials");
    });

    it("publishes six modules and keeps all 28 planned modules empty", async () => {
      const { data: modules } = await admin.from("modules").select("id, slug, position, is_published, plan").eq("course_id", courseId).not("slug", "like", "it-%").order("position");
      expect(modules!.filter((mod) => mod.is_published).map((mod) => mod.slug)).toEqual(PUBLISHED);
      expect(modules!.filter((mod) => PHASE3.includes(mod.slug)).map((mod) => mod.position)).toEqual([4, 5, 6]);
      const plannedIds = modules!.filter((mod) => !mod.is_published).map((mod) => mod.id);
      expect(plannedIds).toHaveLength(28);
      for (const table of ["lessons", "quizzes", "projects", "coding_problems"] as const) {
        expect((await admin.from(table).select("id", { count: "exact", head: true }).in("module_id", plannedIds)).count, table).toBe(0);
      }

      const plans = new Map(modules!.map((mod) => [mod.slug, mod.plan as { objectives?: string[]; lessons?: unknown[]; prerequisites?: string[] }]));
      for (const slug of ["two-pointers", "sliding-window"]) {
        expect(plans.get(slug)!.objectives!.length, slug).toBeGreaterThan(3);
        expect(plans.get(slug)!.lessons!.length, slug).toBeGreaterThan(3);
      }
      expect(plans.get("sliding-window")!.prerequisites).toContain("two-pointers");
      // An authoring brief is never loaded into the database.
      expect(JSON.stringify([...plans.values()])).not.toContain("spec");
    });

    it("marks only the Python phase as preparatory, and stores positions that numbering can be derived from", async () => {
      const { data: phases } = await admin.from("phases").select("slug, is_preparatory").eq("course_id", courseId).order("position");
      expect(phases!.filter((phase) => phase.is_preparatory).map((phase) => phase.slug)).toEqual(["python-foundations"]);
      // Stored order: the two Python modules, then the first DSA module at position 3. Display
      // numbers (P1, P2, DSA Module 1) are derived from this and are not stored anywhere.
      const { data: first } = await admin.from("modules").select("slug, position").eq("course_id", courseId).order("position").limit(3);
      expect(first).toEqual([
        { slug: "python-essentials", position: 1 },
        { slug: "python-collections-and-testing", position: 2 },
        { slug: "correctness-and-cost", position: 3 },
      ]);
    });

    it("loads each Python module in full: six lessons, a ten-question quiz, a project and four problems", async () => {
      for (const slug of ["python-essentials", "python-collections-and-testing"]) {
        const { data: mod } = await admin.from("modules").select("id").eq("course_id", courseId).eq("slug", slug).single();
        expect((await admin.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", mod!.id).eq("is_published", true)).count, slug).toBe(6);
        const { data: quiz } = await admin.from("quizzes").select("id, pass_percent").eq("module_id", mod!.id).single();
        expect(quiz!.pass_percent).toBe(70);
        const { data: questions } = await admin.from("questions").select("type, key:question_keys(correct)").eq("quiz_id", quiz!.id);
        expect(questions, slug).toHaveLength(10);
        expect(new Set(questions!.map((q) => q.type)).size).toBe(4);
        expect(questions!.every((q) => q.key !== null)).toBe(true);
        expect((await admin.from("projects").select("id", { count: "exact", head: true }).eq("module_id", mod!.id)).count).toBe(1);
        expect((await admin.from("coding_problems").select("id", { count: "exact", head: true }).eq("module_id", mod!.id)).count).toBe(4);
      }
    });

    it("loads the first DSA module in full: five lessons, an eight-question quiz, a project and six problems", async () => {
      expect((await admin.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId).eq("is_published", true)).count).toBe(5);
      const { data: quiz } = await admin.from("quizzes").select("id, title").eq("course_id", courseId).eq("slug", QUIZ_SLUG).single();
      expect(quiz!.title).toBe("Assessment: correctness and cost");
      const { data: questions } = await admin.from("questions").select("type, key:question_keys(correct)").eq("quiz_id", quiz!.id);
      expect(questions).toHaveLength(8);
      expect(new Set(questions!.map((q) => q.type)).size).toBe(4);
      expect(questions!.every((q) => q.key !== null)).toBe(true);
      expect((await admin.from("projects").select("id", { count: "exact", head: true }).eq("module_id", moduleId).eq("slug", "measuring-growth")).count).toBe(1);
      const { data: dsaProblems } = await admin.from("coding_problems").select("slug").eq("module_id", moduleId).order("slug");
      expect(dsaProblems!.map((row) => row.slug)).toEqual([
        "count-occurrences",
        "count-the-shifts",
        "first-occurrence",
        "integer-square-root",
        "is-sorted",
        "lower-bound",
      ]);
      expect([...problemIds.keys()].filter((slug) => !slug.startsWith("it-"))).toHaveLength(31);
      const { data: solutions } = await admin.from("coding_problem_solutions").select("editorial_md, reference_solution, hidden_tests");
      expect(solutions!.length).toBeGreaterThanOrEqual(14);
      expect(solutions!.every((row) => row.reference_solution.includes("def ") && (row.hidden_tests as unknown[]).length >= 5)).toBe(true);
    });

    it("seeds two cohorts and exactly one enrolment per demo student", async () => {
      expect((await admin.from("cohorts").select("id", { count: "exact", head: true }).eq("course_id", courseId)).count).toBe(2);
      expect((await admin.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId).in("user_id", [alice.id, bob.id])).count).toBe(2);
    });
  });

  describe("anonymous visitors", () => {
    it("cannot read any table or view", async () => {
      for (const table of [
        "profiles", "courses", "modules", "phases", "cohorts", "lessons", "questions", "question_keys", "quiz_attempts", "submissions",
        "feedback", "contact_messages", "enrolment_requests", "coding_problems", "coding_problem_solutions", "code_submissions",
        "module_path", "lesson_outline", "coding_problem_outline",
      ] as const) {
        // Tables and views are typed separately; the request is the same for both.
        const { data, error } = await anon.from(table as "profiles").select("*").limit(1);
        expect(error !== null || data?.length === 0, `anon read of ${table}`).toBe(true);
      }
    });

    it("can read the public outline, which lists planned modules by title only and contains no content", async () => {
      const { data, error } = await anon.rpc("public_course_outline", { p_slug: COURSE_SLUG });
      expect(error).toBeNull();
      const outline = data as unknown as {
        title: string;
        phases: { title: string }[];
        modules: { slug: string; is_published: boolean; lessons: unknown[]; quiz_count: number; problem_count: number; projects: unknown[]; plan: unknown }[];
      };
      expect(outline.title).toBe("Data Structures and Algorithms");
      expect(outline.phases.map((phase) => phase.title)).toContain("Python foundations");

      const seeded = outline.modules.filter((mod) => !mod.slug.startsWith("it-"));
      expect(seeded).toHaveLength(34);
      const available = seeded.filter((mod) => mod.is_published);
      expect(available.map((mod) => mod.slug)).toEqual(PUBLISHED);
      const dsa = available.find((mod) => mod.slug === MODULE_SLUG)!;
      expect(dsa).toMatchObject({ quiz_count: 1, problem_count: 6 });
      expect(dsa.lessons).toHaveLength(5);
      expect(available[0]).toMatchObject({ quiz_count: 1, problem_count: 4 });
      expect(available[0]!.lessons).toHaveLength(6);
      for (const [slug, problems] of [["recursion-and-induction", 5], ["arrays-and-amortised-analysis", 6], ["linked-lists", 6]] as const) {
        const mod = available.find((m) => m.slug === slug)!;
        expect(mod, slug).toMatchObject({ quiz_count: 1, problem_count: problems });
        expect(mod.lessons, slug).toHaveLength(6);
        expect(mod.projects, slug).toHaveLength(1);
      }
      expect((data as unknown as { phases: { slug: string; is_preparatory: boolean }[] }).phases.filter((phase) => phase.is_preparatory).map((phase) => phase.slug)).toEqual(["python-foundations"]);
      // A planned module is never dressed up as a published one.
      for (const mod of seeded.filter((m) => !m.is_published)) {
        expect(mod).toMatchObject({ lessons: [], quiz_count: 0, problem_count: 0, projects: [] });
      }

      const text = JSON.stringify(data);
      expect(text).not.toContain("body_md");
      expect(text).not.toContain("Think of a number between 1 and 100"); // a sentence from a lesson body
      expect(text).not.toContain("def lower_bound"); // starter code, reference solution
      expect(text).not.toContain("hidden_tests");
      expect(text).not.toContain("reference_solution");
      expect(text).not.toContain("@example.com");
    });

    it("gets nothing for a course slug that does not exist", async () => {
      expect((await anon.rpc("public_course_outline", { p_slug: "scientific-machine-learning-missing" })).data).toBeNull();
    });

    it("cannot search, write contact messages, take rate-limit tokens or read editorials", async () => {
      expect((await anon.rpc("search_course", { p_course_id: courseId, p_query: "binary" })).error).not.toBeNull();
      expect((await anon.from("contact_messages").insert({ name: "x", email: "x@example.com", message: "hello there" })).error).not.toBeNull();
      expect((await anon.rpc("take_rate_limit", { p_bucket: "it", p_key_hash: "x", p_limit: 5, p_window_seconds: 60 })).error).not.toBeNull();
      expect((await anon.rpc("problem_editorial", { p_problem_id: problemIds.get("lower-bound")! })).error).not.toBeNull();
      expect((await anon.rpc("move_module", { p_module_id: moduleId, p_direction: 1 })).error).not.toBeNull();
    });
  });

  describe("a student and another student's data", () => {
    it("sees only their own progress, attempts, submissions, feedback, enrolment and code", async () => {
      for (const [table, column] of [
        ["lesson_progress", "user_id"],
        ["quiz_attempts", "user_id"],
        ["submissions", "user_id"],
        ["feedback", "student_id"],
        ["enrollments", "user_id"],
        ["code_submissions", "user_id"],
      ] as const) {
        const { data, error } = await bob.db.from(table).select("*");
        expect(error, table).toBeNull();
        // The second student has no feedback and no code in the seed data.
        if (table !== "feedback" && table !== "code_submissions") {
          expect(data!.length, `${table} should return the student's own rows`).toBeGreaterThan(0);
        }
        expect(data!.every((row) => (row as Record<string, unknown>)[column] === bob.id), `${table} leaked rows`).toBe(true);
      }
      // The first student does have code, and sees it.
      expect((await alice.db.from("code_submissions").select("id")).data!.length).toBe(3);
    });

    it("cannot fetch another student's rows even when asking for them by id", async () => {
      expect((await bob.db.from("feedback").select("*").eq("student_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("submissions").select("*").eq("user_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("quiz_attempts").select("*").eq("user_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("lesson_progress").select("*").eq("user_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("code_submissions").select("*").eq("user_id", alice.id)).data).toEqual([]);
    });

    it("sees their own profile and staff profiles, but not other students", async () => {
      const { data } = await bob.db.from("profiles").select("id, role");
      const ids = data!.map((row) => row.id);
      expect(ids).toContain(bob.id);
      expect(ids).toContain(instructor.id);
      expect(ids).not.toContain(alice.id);
    });

    it("sees their own cohort and no other", async () => {
      const { data } = await bob.db.from("cohorts").select("slug");
      expect(data!.map((row) => row.slug)).toEqual(["pilot"]);
    });

    it("cannot record progress on behalf of someone else", async () => {
      const { data: lesson } = await bob.db.from("lessons").select("id").limit(1).single();
      const { error } = await bob.db.from("lesson_progress").insert({ user_id: alice.id, lesson_id: lesson!.id });
      expect(error).not.toBeNull();
    });

    it("cannot change or delete another student's submission", async () => {
      const { data: target } = await admin.from("submissions").select("id, notes").eq("user_id", alice.id).eq("project_id", growthProjectId).single();
      await bob.db.from("submissions").update({ notes: "tampered" }).eq("id", target!.id);
      await bob.db.from("submissions").delete().eq("id", target!.id);
      const { data: after } = await admin.from("submissions").select("notes").eq("id", target!.id).single();
      expect(after?.notes).toBe(target!.notes);
    });

    it("cannot mark another student's feedback as read", async () => {
      const { data: unread } = await admin.from("feedback").select("id").eq("student_id", alice.id).is("read_at", null).limit(1).single();
      const { data: changed } = await bob.db.rpc("mark_feedback_read", { p_feedback_ids: [unread!.id] });
      expect(changed).toBe(0);
      const { data: after } = await admin.from("feedback").select("read_at").eq("id", unread!.id).single();
      expect(after?.read_at).toBeNull();
    });
  });

  describe("a student and privileged data", () => {
    it("cannot read quiz answer keys", async () => {
      const { data, error } = await alice.db.from("question_keys").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const embedded = await alice.db.from("questions").select("id, key:question_keys(correct)").limit(5);
      expect(embedded.data!.length).toBeGreaterThan(0);
      expect(embedded.data!.every((row) => row.key === null)).toBe(true);
    });

    it("cannot forge or alter a quiz attempt", async () => {
      const { data: quiz } = await alice.db.from("quizzes").select("id").eq("slug", QUIZ_SLUG).single();
      const forged = await alice.db.from("quiz_attempts").insert({
        quiz_id: quiz!.id,
        user_id: alice.id,
        attempt_number: 99,
        score: 100,
        max_score: 100,
        percent: 100,
        passed: true,
      });
      expect(forged.error).not.toBeNull();

      const { data: own } = await alice.db.from("quiz_attempts").select("id, percent").order("percent").limit(1).single();
      await alice.db.from("quiz_attempts").update({ percent: 100, passed: true }).eq("id", own!.id);
      const { data: after } = await admin.from("quiz_attempts").select("percent").eq("id", own!.id).single();
      expect(Number(after?.percent)).toBe(Number(own!.percent));
    });

    it("cannot promote themselves or change their email", async () => {
      expect((await alice.db.from("profiles").update({ role: "admin" }).eq("id", alice.id)).error).not.toBeNull();
      expect((await alice.db.from("profiles").update({ role: "instructor" }).eq("id", alice.id)).error).not.toBeNull();
      expect((await alice.db.from("profiles").update({ email: "other@example.com" }).eq("id", alice.id)).error).not.toBeNull();
      const { data } = await admin.from("profiles").select("role, email").eq("id", alice.id).single();
      expect(data).toEqual({ role: "student", email: "student@example.com" });
    });

    it("can update the profile fields they own", async () => {
      const { data: before } = await alice.db.from("profiles").select("bio").eq("id", alice.id).single();
      cleanup.push(() => admin.from("profiles").update({ bio: before!.bio }).eq("id", alice.id));
      const { error } = await alice.db.from("profiles").update({ bio: "Updated by a test." }).eq("id", alice.id);
      expect(error).toBeNull();
    });

    it("can store only well-formed https profile links, and no protocol-relative photo", async () => {
      cleanup.push(() => admin.from("profiles").update({ links: [], avatar_url: null }).eq("id", alice.id));
      for (const links of [
        [{ label: "Bad", url: "javascript:alert(1)" }],
        [{ label: "Bad", url: "http://example.org" }],
        [{ label: "", url: "https://example.org" }],
        [{ url: "https://example.org" }],
        ["https://example.org"],
        Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, url: "https://example.org" })),
      ]) {
        const { error } = await alice.db.from("profiles").update({ links }).eq("id", alice.id);
        expect(error?.message, JSON.stringify(links)).toMatch(/check constraint/);
      }
      expect((await alice.db.from("profiles").update({ avatar_url: "//evil.example/x.png" }).eq("id", alice.id)).error?.message).toMatch(/check constraint/);
      expect((await alice.db.from("profiles").update({ links: [{ label: "Site", url: "https://example.org/me" }] }).eq("id", alice.id)).error).toBeNull();
    });

    it("cannot mark their own submission as reviewed or backdate it", async () => {
      const reviewed = await alice.db.from("submissions").update({ status: "reviewed" }).eq("id", open.draftId);
      expect(reviewed.error).not.toBeNull();
      const backdated = await alice.db.from("submissions").update({ submitted_at: "2020-01-01T00:00:00Z" }).eq("id", open.draftId);
      expect(backdated.error).not.toBeNull();
      const { data: after } = await admin.from("submissions").select("status, submitted_at").eq("id", open.draftId).single();
      expect(after).toEqual({ status: "in_progress", submitted_at: null });
    });

    it("cannot edit a submission once it has been reviewed", async () => {
      const { data: done } = await alice.db.from("submissions").select("id, notes").eq("status", "reviewed").eq("project_id", growthProjectId).single();
      await alice.db.from("submissions").update({ notes: "changed after review" }).eq("id", done!.id);
      const { data: after } = await admin.from("submissions").select("notes, status").eq("id", done!.id).single();
      expect(after).toEqual({ notes: done!.notes, status: "reviewed" });
    });

    it("cannot write course content, feedback, announcements, phases or enrolments", async () => {
      const { data: lesson } = await alice.db.from("lessons").select("id, title").limit(1).single();
      await alice.db.from("lessons").update({ title: "Hacked" }).eq("id", lesson!.id);
      const { data: after } = await admin.from("lessons").select("title").eq("id", lesson!.id).single();
      expect(after?.title).toBe(lesson!.title);

      await alice.db.from("modules").update({ title: "Hacked", is_published: false }).eq("id", moduleId);
      expect((await admin.from("modules").select("title, is_published").eq("id", moduleId).single()).data).toEqual({
        title: "Algorithms, correctness and cost",
        is_published: true,
      });

      expect((await alice.db.from("announcements").insert({ course_id: courseId, title: "x", body_md: "x" })).error).not.toBeNull();
      expect((await alice.db.from("phases").insert({ course_id: courseId, slug: "hacked", title: "x", position: 99 })).error).not.toBeNull();
      expect(
        (await alice.db.from("feedback").insert({ course_id: courseId, student_id: alice.id, kind: "general", title: "A+", body_md: "x" })).error,
      ).not.toBeNull();
      await alice.db.from("enrollments").update({ status: "completed" }).eq("user_id", alice.id);
      const { data: enrolment } = await admin.from("enrollments").select("status").eq("user_id", alice.id).eq("course_id", courseId).single();
      expect(enrolment?.status).toBe("active");
    });

    it.each([{ slug: "recursion-and-induction", problems: 5 }, { slug: "arrays-and-amortised-analysis", problems: 6 }, { slug: "linked-lists", problems: 6 }])("publishes $slug with previews for students and keeps its assessment material staff-only", async ({ slug, problems }) => {
      const { data: mod, error } = await admin.from("modules").select("id, is_published, requires_previous").eq("course_id", courseId).eq("slug", slug).single();
      expect(error).toBeNull();
      expect(mod).toMatchObject({ is_published: true, requires_previous: true });
      const id = mod!.id;
      expect((await instructor.db.from("lessons").select("id").eq("module_id", id)).data).toHaveLength(6);
      expect((await instructor.db.from("coding_problems").select("id").eq("module_id", id)).data).toHaveLength(problems);
      // Published titles are previewed to an enrolled student even before the module unlocks.
      expect((await alice.db.from("lesson_outline").select("id").eq("module_id", id)).data, "lesson_outline").toHaveLength(6);
      expect((await alice.db.from("coding_problem_outline").select("id").eq("module_id", id)).data, "coding_problem_outline").toHaveLength(problems);
      const problemRows = (await admin.from("coding_problems").select("id").eq("module_id", id)).data!.map((row) => row.id);
      expect((await alice.db.from("coding_problem_solutions").select("problem_id").in("problem_id", problemRows)).data).toEqual([]);
      const { data: keys } = await alice.db.from("question_keys").select("question_id");
      expect(keys ?? []).toEqual([]);
    });

    it("keeps a planned module closed to students even when it holds a published lesson", async () => {
      const { data: planned } = await admin.from("modules").select("id, is_published").eq("course_id", courseId).eq("slug", "two-pointers").single();
      expect(planned!.is_published).toBe(false);
      const lesson = must(
        "planned-module lesson",
        await admin.from("lessons").insert({ course_id: courseId, module_id: planned!.id, slug: "it-planned-lesson", title: "Integration test: planned lesson", body_md: "SECRET-PLANNED-BODY", position: 900, is_published: true }).select("id").single(),
      );
      cleanup.push(() => admin.from("lessons").delete().eq("id", lesson.id));
      for (const db of [alice.db, bob.db]) {
        expect((await db.from("lessons").select("id").eq("id", lesson.id)).data).toEqual([]);
        expect((await db.from("lesson_outline").select("id").eq("id", lesson.id)).data).toEqual([]);
      }
      expect((await alice.db.from("lesson_progress").insert({ user_id: alice.id, lesson_id: lesson.id })).error).not.toBeNull();
      expect((await instructor.db.from("lessons").select("id").eq("id", lesson.id)).data).toHaveLength(1);
    });

    it("does not see unpublished lessons", async () => {
      const { data: hidden, error } = await admin
        .from("lessons")
        .insert({ course_id: courseId, module_id: moduleId, slug: "rls-test-draft", title: "Draft", position: 900, is_published: false })
        .select("id")
        .single();
      expect(error).toBeNull();
      cleanup.push(() => admin.from("lessons").delete().eq("id", hidden!.id));

      expect((await alice.db.from("lessons").select("id").eq("id", hidden!.id)).data).toEqual([]);
      expect((await alice.db.from("lesson_outline").select("id").eq("id", hidden!.id)).data).toEqual([]);
      expect((await alice.db.from("lesson_progress").insert({ user_id: alice.id, lesson_id: hidden!.id })).error).not.toBeNull();
      expect((await instructor.db.from("lessons").select("id").eq("id", hidden!.id)).data).toHaveLength(1);
    });
  });

  describe("the learning path", () => {
    it("shows a student every module by title, including planned ones, through the path view", async () => {
      const { data, error } = await alice.db.from("module_path").select("slug, title, is_published, plan").eq("course_id", courseId);
      expect(error).toBeNull();
      const seeded = data!.filter((row) => !row.slug!.startsWith("it-"));
      expect(seeded).toHaveLength(34);
      expect(seeded.filter((row) => row.is_published).map((row) => row.slug).sort()).toEqual([...PUBLISHED].sort());
      expect(seeded.find((row) => row.slug === "two-pointers")).toMatchObject({ title: "Two pointers", is_published: false });
    });

    it("does not expose planned modules through the modules table, and the view carries no lesson content", async () => {
      const { data } = await alice.db.from("modules").select("slug").eq("course_id", courseId);
      expect(data!.map((row) => row.slug).sort()).toEqual([...PUBLISHED, "it-locked-module"].sort());
      expect((await alice.db.from("module_path").select("body_md")).error).not.toBeNull();
      const { data: row } = await alice.db.from("module_path").select("*").eq("slug", MODULE_SLUG).single();
      expect(Object.keys(row!).sort()).toEqual(["course_id", "description", "id", "is_published", "phase_id", "plan", "position", "slug", "title"]);
    });

    it("lets a student read the phases of their course", async () => {
      expect((await alice.db.from("phases").select("id").eq("course_id", courseId)).data).toHaveLength(8);
    });
  });

  describe("module locks", () => {
    it("exposes previews but blocks locked bodies, questions, problems, resources and progress writes", async () => {
      expect((await bob.db.from("lesson_outline").select("id").eq("id", locked.lessonId)).data).toHaveLength(1);
      expect((await bob.db.from("coding_problem_outline").select("id, title").eq("id", locked.problemId)).data).toHaveLength(1);
      expect((await bob.db.from("lesson_outline").select("body_md")).error).not.toBeNull();
      expect((await bob.db.from("coding_problem_outline").select("statement_md")).error).not.toBeNull();

      expect((await bob.db.from("lessons").select("*").eq("id", locked.lessonId)).data).toEqual([]);
      expect((await bob.db.from("questions").select("*").eq("quiz_id", locked.quizId)).data).toEqual([]);
      expect((await bob.db.from("coding_problems").select("*").eq("id", locked.problemId)).data).toEqual([]);
      expect((await bob.db.from("resources").select("*").eq("id", locked.resourceId)).data).toEqual([]);
      expect((await bob.db.from("lesson_progress").insert({ user_id: bob.id, lesson_id: locked.lessonId })).error).not.toBeNull();
      expect((await bob.db.from("code_submissions").insert({ problem_id: locked.problemId, user_id: bob.id, code: "x = 1\n", status: "draft" })).error).not.toBeNull();

      expect((await anon.from("lesson_outline").select("*")).error).not.toBeNull();
      expect((await instructor.db.from("lessons").select("id").eq("id", locked.lessonId)).data).toHaveLength(1);
      expect((await instructor.db.from("coding_problems").select("id").eq("id", locked.problemId)).data).toHaveLength(1);
    });

    it("date gates apply even when prerequisites are complete", async () => {
      const { data: mod } = await admin.from("modules").select("id, available_from").eq("id", moduleId).single();
      try {
        await admin.from("modules").update({ available_from: "2099-01-01T00:00:00Z" }).eq("id", mod!.id);
        expect((await alice.db.from("lessons").select("id").eq("module_id", mod!.id)).data).toEqual([]);
        expect((await alice.db.from("coding_problems").select("id").eq("module_id", mod!.id)).data).toEqual([]);
        expect((await alice.db.from("lesson_outline").select("id").eq("module_id", mod!.id)).data!.length).toBeGreaterThan(0);
      } finally {
        await admin.from("modules").update({ available_from: mod!.available_from }).eq("id", mod!.id);
      }
    });

    it("paused enrolments lose previews, content, practice and submission editing without losing history", async () => {
      // The student's submission in this course: the database may hold other courses too, and an
      // enrolment paused here says nothing about access to those.
      const { data: target } = await admin.from("submissions").select("id, notes").eq("user_id", bob.id).eq("project_id", growthProjectId).single();
      try {
        await admin.from("enrollments").update({ status: "paused" }).eq("user_id", bob.id).eq("course_id", courseId);
        expect((await bob.db.from("lesson_outline").select("id").eq("course_id", courseId)).data).toEqual([]);
        expect((await bob.db.from("module_path").select("slug").eq("course_id", courseId)).data).toEqual([]);
        expect((await bob.db.from("lessons").select("id").eq("course_id", courseId)).data).toEqual([]);
        expect((await bob.db.from("coding_problems").select("id").eq("course_id", courseId)).data).toEqual([]);
        expect(
          (await bob.db.from("code_submissions").insert({ problem_id: problemIds.get("is-sorted")!, user_id: bob.id, code: "x = 1\n", status: "draft" })).error,
        ).not.toBeNull();
        await bob.db.from("submissions").update({ notes: "changed while paused" }).eq("id", target!.id);
        expect((await admin.from("submissions").select("notes").eq("id", target!.id).single()).data?.notes).toBe(target!.notes);
        expect((await bob.db.from("lesson_progress").select("lesson_id")).data!.length).toBeGreaterThan(0);
      } finally {
        await admin.from("enrollments").update({ status: "active" }).eq("user_id", bob.id).eq("course_id", courseId);
      }
    });
  });

  describe("coding practice", () => {
    const code = (label: string) => `def is_sorted(items):\n    return True  # ${label}\n`;

    it("shows an enrolled student the statement, examples, hints and starter code, and nothing hidden", async () => {
      const { data, error } = await alice.db.from("coding_problems").select("*").eq("id", problemIds.get("lower-bound")!).single();
      expect(error).toBeNull();
      expect(data!.statement_md).toContain("smallest index");
      expect(data!.starter_code).toContain("def lower_bound");
      expect((data!.examples as unknown[]).length).toBeGreaterThanOrEqual(2);
      expect(data!.hints.length).toBe(3);
      expect(Object.keys(data!)).not.toContain("hidden_tests");
      expect(Object.keys(data!)).not.toContain("reference_solution");
      expect(Object.keys(data!)).not.toContain("editorial_md");
    });

    it("gives the browser runner the visible sample tests as data, and nothing from the hidden set", async () => {
      // This student has one DSA Module 1 lesson left, so DSA Modules 2 to 4 are locked for them:
      // they reach the 14 problems of the Python modules and DSA Module 1. All 31 are covered below.
      const { data: rows } = await alice.db.from("coding_problems").select("slug, examples").eq("course_id", courseId);
      expect(rows!.length).toBe(14);
      const { data: solutions } = await admin.from("coding_problem_solutions").select("problem_id, hidden_tests, reference_solution");
      for (const row of rows!) {
        const examples = row.examples as { function: string; args: unknown[]; expected: unknown; input: string; output: string }[];
        expect(examples.length, row.slug).toBeGreaterThanOrEqual(2);
        expect(examples.length, row.slug).toBeLessThanOrEqual(20);
        for (const example of examples) {
          expect(example.function, row.slug).toMatch(/^[a-z_][a-z0-9_]*$/);
          expect(Array.isArray(example.args), row.slug).toBe(true);
          expect(example.expected, row.slug).not.toBeUndefined();
          expect(example.input.startsWith(`${example.function}(`), row.slug).toBe(true);
        }
        // The sample set and the hidden set are disjoint, so nothing visible reveals a hidden case.
        const hidden = solutions!.find((solution) => solution.problem_id === problemIds.get(row.slug))!.hidden_tests as { args: unknown[] }[];
        const visible = new Set(examples.map((example) => JSON.stringify(example.args)));
        expect(hidden.filter((test) => visible.has(JSON.stringify(test.args))), row.slug).toEqual([]);
      }
    });

    it("never lets a student read the solutions table, by any route", async () => {
      expect((await alice.db.from("coding_problem_solutions").select("*")).data).toEqual([]);
      expect((await alice.db.from("coding_problem_solutions").select("hidden_tests").eq("problem_id", problemIds.get("first-occurrence")!)).data).toEqual([]);
      const embedded = await alice.db.from("coding_problems").select("id, solution:coding_problem_solutions(reference_solution, hidden_tests)").eq("course_id", courseId);
      expect(embedded.data!.every((row) => row.solution === null)).toBe(true);
      expect((await instructor.db.from("coding_problem_solutions").select("problem_id")).data!.length).toBeGreaterThanOrEqual(14);
    });

    it("releases the editorial only after a submitted attempt: not before, and not for a draft", async () => {
      const editorial = (who: { db: Db }, slug: string) => who.db.rpc("problem_editorial", { p_problem_id: problemIds.get(slug)! });

      // Seeded: the first student submitted "first-occurrence" and has only a draft of "lower-bound".
      const released = await editorial(alice, "first-occurrence");
      expect(released.error).toBeNull();
      expect(released.data).toHaveLength(1);
      expect(released.data![0]!.reference_solution).toContain("def first_occurrence");
      expect(released.data![0]!.editorial_md).toContain("Invariant");

      expect((await editorial(alice, "lower-bound")).data).toEqual([]); // draft only
      expect((await editorial(alice, "integer-square-root")).data).toEqual([]); // never opened
      expect((await editorial(bob, "first-occurrence")).data).toEqual([]); // someone else's attempt does not count
      expect((await editorial(instructor, "lower-bound")).data).toHaveLength(1); // staff always
    });

    it("lets a student keep one draft per problem and no more", async () => {
      const problemId = problemIds.get("lower-bound")!;
      const { data: drafts } = await alice.db.from("code_submissions").select("id, code").eq("problem_id", problemId).eq("status", "draft");
      expect(drafts).toHaveLength(1);
      const second = await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "x = 1\n", status: "draft" });
      expect(second.error?.code).toBe("23505");

      // The draft itself can be edited in place, and restored.
      const original = drafts![0]!;
      cleanup.push(() => admin.from("code_submissions").update({ code: original.code }).eq("id", original.id));
      const edited = await alice.db.from("code_submissions").update({ code: "def lower_bound(items, target):\n    return 0\n" }).eq("id", original.id).select("id");
      expect(edited.error).toBeNull();
      expect(edited.data).toHaveLength(1);
    });

    it("stops a student writing, reading or changing another student's code", async () => {
      const { data: target } = await admin.from("code_submissions").select("id, code, status").eq("user_id", alice.id).eq("status", "draft").single();
      expect((await bob.db.from("code_submissions").select("id").eq("id", target!.id)).data).toEqual([]);
      expect((await bob.db.from("code_submissions").update({ code: "tampered" }).eq("id", target!.id).select("id")).data).toEqual([]);
      await bob.db.from("code_submissions").delete().eq("id", target!.id);
      expect((await admin.from("code_submissions").select("code, status").eq("id", target!.id).single()).data).toEqual({ code: target!.code, status: "draft" });
      const forged = await bob.db.from("code_submissions").insert({ problem_id: problemIds.get("is-sorted")!, user_id: alice.id, code: "x = 1\n", status: "submitted" });
      expect(forged.error).not.toBeNull();
    });

    it("freezes a submitted attempt: it cannot be edited, deleted or turned back into a draft", async () => {
      const { data: attempt } = await admin.from("code_submissions").select("id, code").eq("user_id", alice.id).eq("status", "submitted").limit(1).single();
      expect((await alice.db.from("code_submissions").update({ code: "rewritten" }).eq("id", attempt!.id).select("id")).data).toEqual([]);
      expect((await alice.db.from("code_submissions").update({ status: "draft" }).eq("id", attempt!.id).select("id")).data).toEqual([]);
      await alice.db.from("code_submissions").delete().eq("id", attempt!.id);
      expect((await admin.from("code_submissions").select("code, status").eq("id", attempt!.id).single()).data).toEqual({ code: attempt!.code, status: "submitted" });
    });

    it("never lets a student set a verdict, results or a date on their own work", async () => {
      const problemId = problemIds.get("count-the-shifts")!;
      const passed = await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "x = 1\n", status: "submitted", verdict: "passed" });
      expect(passed.error).not.toBeNull();
      const backdated = await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "x = 1\n", status: "draft", created_at: "2020-01-01T00:00:00Z" });
      expect(backdated.error).not.toBeNull();
      const { data: draft } = await admin.from("code_submissions").select("id").eq("user_id", alice.id).eq("status", "draft").limit(1).single();
      expect((await alice.db.from("code_submissions").update({ verdict: "passed" }).eq("id", draft!.id)).error).not.toBeNull();
      expect((await alice.db.from("code_submissions").update({ results: { passed: 10 } }).eq("id", draft!.id)).error).not.toBeNull();
      const { data: verdicts } = await admin.from("code_submissions").select("verdict").eq("user_id", alice.id);
      expect(verdicts!.every((row) => row.verdict === "not_evaluated")).toBe(true);
    });

    it("records submitted attempts as history, opens the editorial, and refuses an identical resubmission", async () => {
      const problemId = problemIds.get("is-sorted")!;
      cleanup.push(() => admin.from("code_submissions").delete().eq("user_id", bob.id));
      expect((await bob.db.rpc("problem_editorial", { p_problem_id: problemId })).data).toEqual([]);

      const draft = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("draft"), status: "draft" });
      expect(draft.error).toBeNull();
      expect((await bob.db.rpc("problem_editorial", { p_problem_id: problemId })).data).toEqual([]);

      const first = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("one"), status: "submitted" });
      expect(first.error).toBeNull();
      expect((await bob.db.rpc("problem_editorial", { p_problem_id: problemId })).data).toHaveLength(1);

      const duplicate = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("one"), status: "submitted" });
      expect(duplicate.error?.message).toContain("practice_duplicate");

      const second = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("two"), status: "submitted" });
      expect(second.error).toBeNull();

      const { data: history } = await bob.db.from("code_submissions").select("status, verdict, code").eq("problem_id", problemId).order("created_at");
      expect(history!.filter((row) => row.status === "submitted").map((row) => row.code)).toEqual([code("one"), code("two")]);
      expect(history!.filter((row) => row.status === "draft")).toHaveLength(1);
      // Nothing is graded: a recorded attempt is never marked as passed.
      expect(history!.every((row) => row.verdict === "not_evaluated")).toBe(true);
      // Another problem's editorial stays closed.
      expect((await bob.db.rpc("problem_editorial", { p_problem_id: problemIds.get("lower-bound")! })).data).toEqual([]);
    });

    it("enforces the hourly limit on recorded attempts in the database", async () => {
      const problemId = problemIds.get("count-occurrences")!;
      cleanup.push(() => admin.from("code_submissions").delete().eq("user_id", bob.id));
      const { count: already } = await admin
        .from("code_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", bob.id)
        .eq("status", "submitted");
      const room = 20 - (already ?? 0);
      for (let index = 0; index < room; index++) {
        const { error } = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code(`limit ${index}`), status: "submitted" });
        expect(error, `attempt ${index + 1} of ${room}`).toBeNull();
      }
      const over = await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("one too many"), status: "submitted" });
      expect(over.error?.message).toContain("practice_limit_hour");
      // Drafts are not attempts and are still allowed.
      expect((await bob.db.from("code_submissions").insert({ problem_id: problemId, user_id: bob.id, code: code("draft"), status: "draft" })).error).toBeNull();
    });

    it("rejects empty and oversized code, and any language but Python", async () => {
      const problemId = problemIds.get("integer-square-root")!;
      cleanup.push(() => admin.from("code_submissions").delete().eq("user_id", alice.id).eq("problem_id", problemId));
      expect((await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "", status: "draft" })).error?.message).toMatch(/check constraint/);
      const tooLong = "x".repeat(20_001);
      expect((await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: tooLong, status: "draft" })).error?.message).toMatch(/check constraint/);
      expect((await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "x".repeat(20_000), status: "draft" })).error).toBeNull();
      expect((await admin.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: "x", status: "submitted", language: "bash" })).error?.message).toMatch(/check constraint/);
    });

    it("stores code as inert text: quotes, markup and SQL come back exactly as written", async () => {
      const problemId = problemIds.get("count-the-shifts")!;
      cleanup.push(() => admin.from("code_submissions").delete().eq("user_id", alice.id).eq("problem_id", problemId));
      const hostile = `import os\nos.system("rm -rf /")  # '; drop table code_submissions; --\nprint("<script>alert(1)</script>")\n`;
      const { data, error } = await alice.db.from("code_submissions").insert({ problem_id: problemId, user_id: alice.id, code: hostile, status: "draft" }).select("code").single();
      expect(error).toBeNull();
      expect(data!.code).toBe(hostile);
      expect((await admin.from("code_submissions").select("id", { count: "exact", head: true })).error).toBeNull();
    });
  });

  describe("Phase 3 unlocking, for a new student who works through the course", () => {
    let carol: { db: Db; id: string };
    const email = `it-phase3-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const lessonsOf = async (slug: string) => {
      const { data: mod } = await admin.from("modules").select("id").eq("course_id", courseId).eq("slug", slug).single();
      return (await admin.from("lessons").select("id").eq("module_id", mod!.id).eq("is_published", true).order("position")).data!.map((row) => row.id);
    };
    const complete = async (ids: string[]) => {
      for (const id of ids) expect((await carol.db.from("lesson_progress").insert({ user_id: carol.id, lesson_id: id })).error, id).toBeNull();
    };
    const opens = async (slug: string) => {
      const { data: mod } = await admin.from("modules").select("id").eq("course_id", courseId).eq("slug", slug).single();
      return ((await carol.db.from("lessons").select("id").eq("module_id", mod!.id)).data ?? []).length > 0;
    };

    beforeAll(async () => {
      const temporaryPassword = `It-${crypto.randomUUID()}!`;
      const created = await admin.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(`Fixture "phase 3 student" failed: ${created.error?.message}`);
      const id = created.data.user.id;
      // Deleting the user cascades to the profile, enrolment, progress and code submissions made here.
      cleanup.push(() => admin.auth.admin.deleteUser(id));
      must("phase 3 enrolment", await admin.from("enrollments").insert({ user_id: id, course_id: courseId, status: "active" }).select("id").single());
      const db = client(anonKey);
      const signedIn = await db.auth.signInWithPassword({ email, password: temporaryPassword });
      if (signedIn.error) throw new Error(`Fixture "phase 3 sign-in" failed: ${signedIn.error.message}`);
      carol = { db, id };
    });

    it("1. opens the Python modules and DSA Module 1 to a new student, and nothing after them", async () => {
      expect(await opens("python-essentials")).toBe(true);
      expect(await opens(MODULE_SLUG)).toBe(true);
      for (const slug of PHASE3) expect(await opens(slug), slug).toBe(false);
    });

    it("2. keeps recursion locked while a DSA Module 1 lesson is unfinished", async () => {
      const dsa1 = await lessonsOf(MODULE_SLUG);
      await complete(dsa1.slice(0, -1));
      expect(await opens("recursion-and-induction")).toBe(false);
    });

    it("6. refuses progress, code and quiz attempts in a locked module, however they are addressed", async () => {
      const [lesson] = await lessonsOf("recursion-and-induction");
      expect((await carol.db.from("lesson_progress").insert({ user_id: carol.id, lesson_id: lesson! })).error).not.toBeNull();
      const { data: mod } = await admin.from("modules").select("id").eq("course_id", courseId).eq("slug", "recursion-and-induction").single();
      const { data: problem } = await admin.from("coding_problems").select("id").eq("module_id", mod!.id).limit(1).single();
      expect((await carol.db.from("coding_problems").select("id").eq("id", problem!.id)).data).toEqual([]);
      expect((await carol.db.from("code_submissions").insert({ problem_id: problem!.id, user_id: carol.id, code: "x = 1\n", status: "draft" })).error).not.toBeNull();
      const { data: quiz } = await admin.from("quizzes").select("id").eq("module_id", mod!.id).single();
      expect((await carol.db.from("questions").select("id").eq("quiz_id", quiz!.id)).data).toEqual([]);
    });

    it("3. opens recursion once every DSA Module 1 lesson is complete, without its quiz or project", async () => {
      const dsa1 = await lessonsOf(MODULE_SLUG);
      await complete(dsa1.slice(-1));
      expect(await opens("recursion-and-induction")).toBe(true);
      expect(await opens("arrays-and-amortised-analysis")).toBe(false);
    });

    it("4. opens arrays after the recursion lessons, and 5. linked lists after the arrays lessons", async () => {
      await complete(await lessonsOf("recursion-and-induction"));
      expect(await opens("arrays-and-amortised-analysis")).toBe(true);
      expect(await opens("linked-lists")).toBe(false);
      await complete(await lessonsOf("arrays-and-amortised-analysis"));
      expect(await opens("linked-lists")).toBe(true);
    });

    it("7. keeps the planned module after linked lists closed once the linked-list lessons are done", async () => {
      await complete(await lessonsOf("linked-lists"));
      const { data: planned } = await admin.from("modules").select("id, is_published, position").eq("course_id", courseId).eq("slug", "two-pointers").single();
      expect(planned).toMatchObject({ is_published: false, position: 7 });
      expect((await carol.db.from("modules").select("id").eq("id", planned!.id)).data).toEqual([]);
      const lesson = must(
        "planned-module lesson",
        await admin.from("lessons").insert({ course_id: courseId, module_id: planned!.id, slug: "it-phase3-planned-lesson", title: "Integration test: planned lesson", body_md: "SECRET-PLANNED-BODY", position: 901, is_published: true }).select("id").single(),
      );
      try {
        expect((await carol.db.from("lessons").select("id").eq("id", lesson.id)).data).toEqual([]);
        expect((await carol.db.from("lesson_outline").select("id").eq("id", lesson.id)).data).toEqual([]);
        expect((await carol.db.from("lesson_progress").insert({ user_id: carol.id, lesson_id: lesson.id })).error).not.toBeNull();
      } finally {
        await admin.from("lessons").delete().eq("id", lesson.id);
      }
      const { data: path } = await carol.db.from("module_path").select("slug, is_published").eq("course_id", courseId).not("slug", "like", "it-%");
      expect(path!.filter((row) => !row.is_published)).toHaveLength(28);
    });

    it("gives the browser runner every one of the 31 published problems' samples, and nothing hidden", async () => {
      // This student finished linked lists, so the suite's own locked fixture module after it is open too.
      const { data: rows } = await carol.db.from("coding_problems").select("*").eq("course_id", courseId).not("slug", "like", "it-%");
      expect(rows!.map((row) => row.slug)).toHaveLength(31);
      const { data: solutions } = await admin.from("coding_problem_solutions").select("problem_id, hidden_tests, reference_solution, editorial_md");
      for (const row of rows!) {
        expect(Object.keys(row), row.slug).not.toContain("hidden_tests");
        expect(Object.keys(row), row.slug).not.toContain("reference_solution");
        expect(Object.keys(row), row.slug).not.toContain("editorial_md");
        const solution = solutions!.find((candidate) => candidate.problem_id === row.id)!;
        const hidden = solution.hidden_tests as { args: unknown[] }[];
        expect(hidden.length, row.slug).toBeGreaterThanOrEqual(5);
        const examples = row.examples as { args: unknown[] }[];
        expect(examples.length, row.slug).toBeGreaterThanOrEqual(2);
        const visible = new Set(examples.map((example) => JSON.stringify(example.args)));
        expect(hidden.filter((test) => visible.has(JSON.stringify(test.args))), row.slug).toEqual([]);
        // Nothing a student can read from the problem row carries the reference solution or editorial.
        const text = JSON.stringify(row);
        expect(text.includes(solution.reference_solution.trim()), row.slug).toBe(false);
        expect(text.includes(solution.editorial_md.trim()), row.slug).toBe(false);
      }
      expect((await carol.db.from("coding_problem_solutions").select("*")).data).toEqual([]);
      expect((await carol.db.from("question_keys").select("*")).data).toEqual([]);
    });

    it("keeps Phase 3 practice self-review: the editorial opens on submission, and no verdict can be claimed", async () => {
      const { data: problem } = await admin.from("coding_problems").select("id").eq("course_id", courseId).eq("slug", "reverse-linked-chain").single();
      const editorial = () => carol.db.rpc("problem_editorial", { p_problem_id: problem!.id });
      expect((await editorial()).data).toEqual([]);
      expect((await carol.db.from("code_submissions").insert({ problem_id: problem!.id, user_id: carol.id, code: "x = 1\n", status: "submitted", verdict: "passed" })).error).not.toBeNull();
      expect((await carol.db.from("code_submissions").insert({ problem_id: problem!.id, user_id: carol.id, code: "x = 1\n", status: "submitted" })).error).toBeNull();
      const { data: released } = await editorial();
      expect(released).toHaveLength(1);
      expect(released![0]!.reference_solution).toContain("def ");
      const { data: stored } = await admin.from("code_submissions").select("status, verdict").eq("user_id", carol.id).eq("problem_id", problem!.id).single();
      expect(stored).toMatchObject({ status: "submitted", verdict: "not_evaluated" });
    });
  });

  describe("rate limiting", () => {
    it("allows requests up to the limit, then refuses, and only the service role may call it", async () => {
      const bucket = `it:${Date.now()}`;
      cleanup.push(() => admin.from("rate_limit_hits").delete().eq("bucket", bucket));
      const take = (key: string) => admin.rpc("take_rate_limit", { p_bucket: bucket, p_key_hash: key, p_limit: 2, p_window_seconds: 600 });

      expect((await take("a")).data).toBe(true);
      expect((await take("a")).data).toBe(true);
      expect((await take("a")).data).toBe(false);
      expect((await take("a")).data).toBe(false);
      // Limits are per key: another visitor is unaffected.
      expect((await take("b")).data).toBe(true);
      // A refused request is not recorded, so it cannot extend the lock-out.
      expect((await admin.from("rate_limit_hits").select("id", { count: "exact", head: true }).eq("bucket", bucket).eq("key_hash", "a")).count).toBe(2);

      expect((await alice.db.rpc("take_rate_limit", { p_bucket: bucket, p_key_hash: "a", p_limit: 99, p_window_seconds: 600 })).error).not.toBeNull();
      expect((await instructor.db.rpc("take_rate_limit", { p_bucket: bucket, p_key_hash: "a", p_limit: 99, p_window_seconds: 600 })).error).not.toBeNull();
      const direct = await alice.db.from("rate_limit_hits").select("*");
      expect(direct.error !== null || direct.data?.length === 0).toBe(true);
    });

    it("counts only requests inside the window", async () => {
      const bucket = `it-window:${Date.now()}`;
      cleanup.push(() => admin.from("rate_limit_hits").delete().eq("bucket", bucket));
      await admin.from("rate_limit_hits").insert({ bucket, key_hash: "k", created_at: new Date(Date.now() - 3_600_000).toISOString() });
      // An hour-old request does not count against a ten-minute window.
      expect((await admin.rpc("take_rate_limit", { p_bucket: bucket, p_key_hash: "k", p_limit: 1, p_window_seconds: 600 })).data).toBe(true);
      expect((await admin.rpc("take_rate_limit", { p_bucket: bucket, p_key_hash: "k", p_limit: 1, p_window_seconds: 600 })).data).toBe(false);
    });
  });

  describe("private course files", () => {
    it("keeps the course-files bucket private", async () => {
      const { data, error } = await admin.storage.getBucket("course-files");
      expect(error).toBeNull();
      expect(data?.public).toBe(false);
    });

    it("lets staff upload, an enrolled student download through a signed link, and nobody else", async () => {
      const path = `${COURSE_SLUG}/integration-test/${Date.now()}.txt`;
      cleanup.push(() => admin.storage.from("course-files").remove([path]));

      expect((await alice.db.storage.from("course-files").upload(path, "student upload")).error).not.toBeNull();
      expect((await instructor.db.storage.from("course-files").upload(path, "course notes")).error).toBeNull();

      const signed = await alice.db.storage.from("course-files").createSignedUrl(path, 60);
      expect(signed.error).toBeNull();
      expect(await (await fetch(signed.data!.signedUrl)).text()).toBe("course notes");

      expect((await anon.storage.from("course-files").createSignedUrl(path, 60)).error).not.toBeNull();
      expect((await fetch(`${url}/storage/v1/object/public/course-files/${path}`)).ok).toBe(false);
      expect((await alice.db.storage.from("course-files").remove([path])).data ?? []).toEqual([]);
      expect((await instructor.db.storage.from("course-files").createSignedUrl(path, 60)).error).toBeNull();

      try {
        await admin.from("enrollments").update({ status: "withdrawn" }).eq("user_id", bob.id).eq("course_id", courseId);
        expect((await bob.db.storage.from("course-files").createSignedUrl(path, 60)).error).not.toBeNull();
      } finally {
        await admin.from("enrollments").update({ status: "active" }).eq("user_id", bob.id).eq("course_id", courseId);
      }
      expect((await bob.db.storage.from("course-files").createSignedUrl(path, 60)).error).toBeNull();
    });

    it("ties a file to its course: an enrolment in one course does not open another course's files", async () => {
      const { data: other } = await admin.from("courses").insert({ slug: "rls-files-course", title: "Other", is_published: true }).select("id").single();
      cleanup.push(() => admin.from("courses").delete().eq("id", other!.id));
      const foreign = `rls-files-course/notes-${Date.now()}.txt`;
      const loose = `top-level-${Date.now()}.txt`;
      cleanup.push(() => admin.storage.from("course-files").remove([foreign, loose]));
      expect((await instructor.db.storage.from("course-files").upload(foreign, "other course")).error).toBeNull();
      expect((await instructor.db.storage.from("course-files").upload(loose, "no course folder")).error).toBeNull();

      // Enrolled in the DSA course only: neither the other course's file nor a file outside
      // any course folder can be signed.
      expect((await alice.db.storage.from("course-files").createSignedUrl(foreign, 60)).error).not.toBeNull();
      expect((await alice.db.storage.from("course-files").createSignedUrl(loose, 60)).error).not.toBeNull();
      expect((await alice.db.storage.from("course-files").list("rls-files-course")).data ?? []).toEqual([]);

      const { data: enrolment } = await admin.from("enrollments").insert({ user_id: alice.id, course_id: other!.id, status: "active" }).select("id").single();
      cleanup.push(() => admin.from("enrollments").delete().eq("id", enrolment!.id));
      expect((await alice.db.storage.from("course-files").createSignedUrl(foreign, 60)).error).toBeNull();
      expect((await alice.db.storage.from("course-files").createSignedUrl(loose, 60)).error).not.toBeNull();
    });
  });

  describe("search", () => {
    it("finds lessons, modules, problems, projects and resources for an enrolled student", async () => {
      const { data, error } = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: "binary search" });
      expect(error).toBeNull();
      expect(data!.some((row) => row.kind === "lesson" && row.slug === "binary-search")).toBe(true);

      const kinds = new Set<string>();
      for (const query of ["insertion", "correctness", "lower bound", "measure", "bisect"]) {
        const result = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: query });
        for (const row of result.data ?? []) kinds.add(row.kind);
      }
      expect([...kinds].sort()).toEqual(["lesson", "module", "problem", "project", "resource"]);
    });

    it("returns coding problems with the slug their practice page needs", async () => {
      const { data } = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: "lower bound" });
      expect(data!.find((row) => row.kind === "problem")).toMatchObject({ slug: "lower-bound", title: "Lower bound" });
    });

    it("does not find locked, planned or unpublished content", async () => {
      const find = async (who: { db: Db }, query: string) => (await who.db.rpc("search_course", { p_course_id: courseId, p_query: query })).data ?? [];
      // Content of the locked fixture module: visible to staff, not to the student.
      expect((await find(instructor, "integration test locked")).some((row) => row.kind === "problem")).toBe(true);
      expect((await find(bob, "integration test locked")).filter((row) => row.kind === "problem" || row.kind === "lesson")).toEqual([]);
      // Planned modules are not search results: there is nothing to open.
      expect((await find(alice, "sliding window")).filter((row) => row.kind === "module")).toEqual([]);
      // Hidden material is not indexed for anyone through this function.
      expect(await find(alice, "bisect_left hidden_tests")).toEqual([]);
    });

    it("returns nothing for very short queries and survives odd input", async () => {
      expect((await alice.db.rpc("search_course", { p_course_id: courseId, p_query: "a" })).data).toEqual([]);
      for (const query of ["100%", "a_b", "'; drop table lessons; --", "\\", "(((", "<script>"]) {
        const { error } = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: query });
        expect(error, query).toBeNull();
      }
    });
  });

  describe("an instructor", () => {
    it("can read every student's progress, code and the answer keys", async () => {
      const { data: progress } = await instructor.db.from("lesson_progress").select("user_id");
      const users = new Set(progress!.map((row) => row.user_id));
      expect(users.has(alice.id) && users.has(bob.id)).toBe(true);
      expect((await instructor.db.from("question_keys").select("question_id")).data!.length).toBeGreaterThan(0);
      expect((await instructor.db.from("code_submissions").select("id").eq("user_id", alice.id)).data!.length).toBeGreaterThan(0);
    });

    it("cannot set a verdict either: grading is reserved for the service role", async () => {
      const { data: attempt } = await admin.from("code_submissions").select("id").eq("user_id", alice.id).eq("status", "submitted").limit(1).single();
      expect((await instructor.db.from("code_submissions").update({ verdict: "passed" }).eq("id", attempt!.id)).error).not.toBeNull();
      expect((await admin.from("code_submissions").select("verdict").eq("id", attempt!.id).single()).data?.verdict).toBe("not_evaluated");
    });

    it("can leave feedback and review a submission, and the student then sees it", async () => {
      const { data: pending } = await instructor.db
        .from("submissions")
        .select("id, user_id, project_id")
        .eq("status", "submitted")
        .eq("project_id", growthProjectId)
        .single();
      const { data: created, error } = await instructor.db
        .from("feedback")
        .insert({
          course_id: courseId,
          student_id: pending!.user_id,
          author_id: instructor.id,
          kind: "project",
          project_id: pending!.project_id,
          submission_id: pending!.id,
          title: "Integration test review",
          body_md: "Checked by a test.",
          score: 70,
          max_score: 100,
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      cleanup.push(() => admin.from("feedback").delete().eq("id", created!.id));

      const reviewed = await instructor.db.from("submissions").update({ status: "reviewed" }).eq("id", pending!.id).select("status, reviewed_at").single();
      expect(reviewed.data?.status).toBe("reviewed");
      expect(reviewed.data?.reviewed_at).not.toBeNull();
      cleanup.push(() => admin.from("submissions").update({ status: "submitted", submitted_at: new Date(Date.now() - 86_400_000).toISOString() }).eq("id", pending!.id));

      const { data: seen } = await bob.db.from("feedback").select("title, read_at").eq("id", created!.id).single();
      expect(seen).toEqual({ title: "Integration test review", read_at: null });
      expect((await bob.db.rpc("mark_feedback_read", { p_feedback_ids: [created!.id] })).data).toBe(1);
    });

    it("can edit a module and move it; a student can do neither", async () => {
      const order = async () =>
        (await admin.from("modules").select("id").eq("course_id", courseId).order("position", { ascending: false }).limit(2)).data!.map((row) => row.id);
      const [last, secondLast] = await order();
      expect(last).toBe(locked.moduleId);

      expect((await alice.db.rpc("move_module", { p_module_id: locked.moduleId, p_direction: -1 })).error?.code).toBe("42501");
      expect(await order()).toEqual([last, secondLast]);

      expect((await instructor.db.rpc("move_module", { p_module_id: locked.moduleId, p_direction: -1 })).error).toBeNull();
      expect(await order()).toEqual([secondLast, last]);
      // Moving the first of the two up again is a swap back; moving past the end is a no-op.
      expect((await instructor.db.rpc("move_module", { p_module_id: locked.moduleId, p_direction: 1 })).error).toBeNull();
      expect((await instructor.db.rpc("move_module", { p_module_id: locked.moduleId, p_direction: 1 })).error).toBeNull();
      expect(await order()).toEqual([last, secondLast]);

      const renamed = await instructor.db.from("modules").update({ title: "Integration test: renamed", is_published: false }).eq("id", locked.moduleId).select("title, is_published").single();
      expect(renamed.data).toEqual({ title: "Integration test: renamed", is_published: false });
      // Unpublished, it drops out of the student's modules but stays on the path as planned.
      expect((await bob.db.from("modules").select("id").eq("id", locked.moduleId)).data).toEqual([]);
      expect((await bob.db.from("module_path").select("is_published").eq("id", locked.moduleId).single()).data).toEqual({ is_published: false });
      await admin.from("modules").update({ title: "Integration test: locked module", is_published: true }).eq("id", locked.moduleId);
    });

    it("does not become staff through anything a profile's owner can edit", async () => {
      // Staff status is read from profiles.role, which no signed-in user can write.
      await alice.db.auth.updateUser({ data: { role: "instructor", full_name: "Mallory" } });
      const { data } = await admin.from("profiles").select("role").eq("id", alice.id).single();
      expect(data?.role).toBe("student");
      expect((await alice.db.from("question_keys").select("question_id")).data).toEqual([]);
      expect((await alice.db.from("modules").update({ title: "x" }).eq("id", moduleId).select("id")).data).toEqual([]);
      await admin.auth.admin.updateUserById(alice.id, { user_metadata: { full_name: "Amina Yusuf" } });
    });
  });

  describe("database constraints", () => {
    it("rejects feedback whose kind does not match what it is attached to", async () => {
      const { error } = await admin.from("feedback").insert({ course_id: courseId, student_id: alice.id, kind: "project", title: "x", body_md: "x" });
      expect(error?.message).toMatch(/check constraint/);
    });

    it("rejects a submitted project without a link, and non-https links", async () => {
      const noLink = await admin.from("submissions").insert({ project_id: open.projectId, user_id: bob.id, status: "submitted" });
      expect(noLink.error?.message).toMatch(/check constraint/);
      const badLink = await admin.from("submissions").insert({ project_id: open.projectId, user_id: bob.id, work_url: "javascript:alert(1)" });
      expect(badLink.error?.message).toMatch(/check constraint/);
    });

    it("keeps a lesson's course consistent with its module", async () => {
      const { data: other } = await admin.from("courses").insert({ slug: "rls-test-course", title: "Other" }).select("id").single();
      cleanup.push(() => admin.from("courses").delete().eq("id", other!.id));
      const { error } = await admin.from("lessons").insert({ course_id: other!.id, module_id: moduleId, slug: "mismatch", title: "x", position: 901 });
      expect(error?.message).toMatch(/foreign key/);
    });

    it("keeps a module's phase in the same course, and a plan must be an object", async () => {
      const { data: other } = await admin.from("courses").insert({ slug: "rls-test-course-2", title: "Other" }).select("id").single();
      cleanup.push(() => admin.from("courses").delete().eq("id", other!.id));
      const { data: foreignPhase } = await admin.from("phases").insert({ course_id: other!.id, slug: "elsewhere", title: "Elsewhere", position: 1 }).select("id").single();
      expect((await admin.from("modules").update({ phase_id: foreignPhase!.id }).eq("id", locked.moduleId)).error?.message).toMatch(/foreign key/);
      expect((await admin.from("modules").update({ plan: ["not", "an", "object"] }).eq("id", locked.moduleId)).error?.message).toMatch(/check constraint/);
    });

    it("the instructor area's course is unaffected by other courses existing", async () => {
      // A second, older-looking course must not change which course the slug resolves to.
      const { data: other } = await admin.from("courses").insert({ slug: "aaa-first-course", title: "Not this one", created_at: "2000-01-01T00:00:00Z" }).select("id").single();
      cleanup.push(() => admin.from("courses").delete().eq("id", other!.id));
      const { data } = await instructor.db.from("courses").select("id").eq("slug", COURSE_SLUG).maybeSingle();
      expect(data?.id).toBe(courseId);
      expect(data?.id).not.toBe(other!.id);
    });
  });

  describe("authoring functions", () => {
    const saveArgs = (quizId: string, questionId: string | null, prompt: string) => ({
      p_quiz_id: quizId,
      p_question_id: questionId as unknown as string,
      p_type: "multiple_choice" as const,
      p_prompt_md: prompt,
      p_options: [
        { id: "a", text: "First" },
        { id: "b", text: "Second" },
      ],
      p_correct: "b",
      p_explanation_md: "Because.",
      p_points: 2,
    });

    it("lets an instructor save a question and its key together, and edit it in place", async () => {
      const { data: quiz } = await admin
        .from("quizzes")
        .insert({ course_id: courseId, module_id: moduleId, slug: "authoring-test-quiz", title: "Authoring test", is_published: false })
        .select("id")
        .single();
      cleanup.push(() => admin.from("quizzes").delete().eq("id", quiz!.id));

      const first = await instructor.db.rpc("save_quiz_question", saveArgs(quiz!.id, null, "First prompt"));
      expect(first.error).toBeNull();
      const second = await instructor.db.rpc("save_quiz_question", saveArgs(quiz!.id, null, "Second prompt"));
      expect(second.error).toBeNull();

      const stored = await admin.from("questions").select("id, position, prompt_md, points, key:question_keys(correct, explanation_md)").eq("quiz_id", quiz!.id).order("position");
      expect(stored.data!.map((q) => [q.position, q.prompt_md])).toEqual([[1, "First prompt"], [2, "Second prompt"]]);
      expect(stored.data![0]!.key).toEqual({ correct: "b", explanation_md: "Because." });

      const edited = await instructor.db.rpc("save_quiz_question", { ...saveArgs(quiz!.id, first.data, "Edited prompt"), p_correct: "a" });
      expect(edited.data).toBe(first.data);
      const after = await admin.from("questions").select("prompt_md, position, key:question_keys(correct)").eq("id", first.data!).single();
      expect(after.data).toEqual({ prompt_md: "Edited prompt", position: 1, key: { correct: "a" } });
      expect((await admin.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quiz!.id)).count).toBe(2);

      // Reordering swaps neighbours and is a no-op at either end.
      expect((await instructor.db.rpc("move_quiz_question", { p_question_id: first.data!, p_direction: 1 })).error).toBeNull();
      const moved = await admin.from("questions").select("id, position").eq("quiz_id", quiz!.id).order("position");
      expect(moved.data!.map((q) => q.id)).toEqual([second.data, first.data]);
      expect(moved.data!.map((q) => q.position)).toEqual([1, 2]);
      await instructor.db.rpc("move_quiz_question", { p_question_id: first.data!, p_direction: 1 });
      const still = await admin.from("questions").select("id").eq("quiz_id", quiz!.id).order("position");
      expect(still.data!.map((q) => q.id)).toEqual([second.data, first.data]);

      // A question cannot be saved into a different quiz than the one it belongs to.
      const { data: other } = await admin.from("quizzes").select("id").eq("course_id", courseId).eq("slug", QUIZ_SLUG).single();
      const crossed = await instructor.db.rpc("save_quiz_question", saveArgs(other!.id, first.data, "Hijacked"));
      expect(crossed.error).not.toBeNull();
      expect((await admin.from("questions").select("prompt_md").eq("id", first.data!).single()).data?.prompt_md).toBe("Edited prompt");
    });

    it("refuses students, and leaves nothing behind when it does", async () => {
      const { data: quiz } = await admin.from("quizzes").select("id").eq("course_id", courseId).eq("slug", QUIZ_SLUG).single();
      const before = await admin.from("questions").select("id, position").eq("quiz_id", quiz!.id).order("position");
      expect(before.data).toHaveLength(8);

      const saved = await alice.db.rpc("save_quiz_question", saveArgs(quiz!.id, null, "Injected"));
      expect(saved.error?.code).toBe("42501");
      const overwritten = await alice.db.rpc("save_quiz_question", saveArgs(quiz!.id, before.data![0]!.id, "Overwritten"));
      expect(overwritten.error?.code).toBe("42501");
      expect((await alice.db.rpc("move_quiz_question", { p_question_id: before.data![0]!.id, p_direction: 1 })).error?.code).toBe("42501");

      const { data: lesson } = await admin.from("lessons").select("id").eq("course_id", courseId).eq("slug", "algorithms-and-correctness").single();
      expect((await alice.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: 1 })).error?.code).toBe("42501");
      expect((await anon.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: 1 })).error).not.toBeNull();

      const after = await admin.from("questions").select("id, position").eq("quiz_id", quiz!.id).order("position");
      expect(after.data).toEqual(before.data);
      expect((await admin.from("questions").select("id").eq("prompt_md", "Injected")).data).toEqual([]);
    });

    it("lets an instructor reorder lessons within a module", async () => {
      const order = async () =>
        (await admin.from("lessons").select("slug").eq("module_id", moduleId).eq("is_published", true).order("position")).data!.map((l) => l.slug);
      const original = await order();
      expect(original).toEqual(["algorithms-and-correctness", "counting-cost", "asymptotic-notation", "binary-search", "insertion-sort"]);
      const { data: lesson } = await admin.from("lessons").select("id").eq("slug", original[0]!).eq("course_id", courseId).single();

      expect((await instructor.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: 1 })).error).toBeNull();
      expect(await order()).toEqual([original[1], original[0], ...original.slice(2)]);
      expect((await instructor.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: -1 })).error).toBeNull();
      expect(await order()).toEqual(original);
    });
  });
});

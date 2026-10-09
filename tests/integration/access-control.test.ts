/**
 * Row-level security, exercised through the real API with real sessions.
 *
 * These tests sign in as the seeded accounts and try to do things they must not be able to do.
 * Requires a running, seeded local stack: `npm run db:start && npm run seed`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

type Db = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.SEED_DEMO_PASSWORD ?? "";
const configured = Boolean(url && anonKey && serviceKey && password);

function client(key: string): Db {
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email: string): Promise<{ db: Db; id: string }> {
  const db = client(anonKey);
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not sign in as ${email}: ${error?.message}. Did you run \`npm run seed\`?`);
  return { db, id: data.user.id };
}

describe.skipIf(!configured)("row-level security", () => {
  let anon: Db;
  let admin: Db;
  let alice: { db: Db; id: string };
  let bob: { db: Db; id: string };
  let instructor: { db: Db; id: string };
  let courseId: string;
  const cleanup: (() => PromiseLike<unknown>)[] = [];

  beforeAll(async () => {
    anon = client(anonKey);
    admin = client(serviceKey);
    [alice, bob, instructor] = await Promise.all([
      signIn("student@example.com"),
      signIn("student2@example.com"),
      signIn("instructor@example.com"),
    ]);
    const { data } = await admin.from("courses").select("id").limit(1).single();
    courseId = data!.id;
  });

  afterAll(async () => {
    for (const undo of cleanup.reverse()) await undo();
  });

  describe("anonymous visitors", () => {
    it("cannot read any table", async () => {
      for (const table of ["profiles", "courses", "lessons", "questions", "question_keys", "quiz_attempts", "submissions", "feedback", "contact_messages"] as const) {
        const { data, error } = await anon.from(table).select("*").limit(1);
        expect(error !== null || data?.length === 0, `anon read of ${table}`).toBe(true);
      }
    });

    it("can read the public outline, which contains no lesson bodies", async () => {
      const { data, error } = await anon.rpc("public_course_outline", { p_slug: "scientific-machine-learning" });
      expect(error).toBeNull();
      const text = JSON.stringify(data);
      expect(text).toContain("Numerical foundations");
      expect(text).not.toContain("body_md");
      expect(text).not.toContain("Replacing derivatives with differences");
      expect(text).not.toContain("@example.com");
    });

    it("cannot search the course or write contact messages directly", async () => {
      expect((await anon.rpc("search_course", { p_course_id: courseId, p_query: "stability" })).error).not.toBeNull();
      expect((await anon.from("contact_messages").insert({ name: "x", email: "x@example.com", message: "hello there" })).error).not.toBeNull();
    });
  });

  describe("a student and another student's data", () => {
    it("sees only their own progress, attempts, submissions and feedback", async () => {
      for (const [table, column] of [
        ["lesson_progress", "user_id"],
        ["quiz_attempts", "user_id"],
        ["submissions", "user_id"],
        ["feedback", "student_id"],
        ["enrollments", "user_id"],
      ] as const) {
        const { data, error } = await bob.db.from(table).select("*");
        expect(error, table).toBeNull();
        // Bob has no feedback in the seed data; every other table must return his rows.
        if (table !== "feedback") expect(data!.length, `${table} should return the student's own rows`).toBeGreaterThan(0);
        expect(data!.every((row) => (row as Record<string, unknown>)[column] === bob.id), `${table} leaked rows`).toBe(true);
      }
    });

    it("cannot fetch another student's rows even when asking for them by id", async () => {
      expect((await bob.db.from("feedback").select("*").eq("student_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("submissions").select("*").eq("user_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("quiz_attempts").select("*").eq("user_id", alice.id)).data).toEqual([]);
      expect((await bob.db.from("lesson_progress").select("*").eq("user_id", alice.id)).data).toEqual([]);
    });

    it("sees their own profile and staff profiles, but not other students", async () => {
      const { data } = await bob.db.from("profiles").select("id, role");
      const ids = data!.map((row) => row.id);
      expect(ids).toContain(bob.id);
      expect(ids).toContain(instructor.id);
      expect(ids).not.toContain(alice.id);
    });

    it("cannot record progress on behalf of someone else", async () => {
      const { data: lesson } = await bob.db.from("lessons").select("id").limit(1).single();
      const { error } = await bob.db.from("lesson_progress").insert({ user_id: alice.id, lesson_id: lesson!.id });
      expect(error).not.toBeNull();
    });

    it("cannot change or delete another student's submission", async () => {
      const { data: target } = await admin.from("submissions").select("id, notes").eq("user_id", alice.id).limit(1).single();
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
      expect(embedded.data!.every((row) => row.key === null)).toBe(true);
    });

    it("cannot forge or alter a quiz attempt", async () => {
      const { data: quiz } = await alice.db.from("quizzes").select("id").limit(1).single();
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

    it("cannot mark their own submission as reviewed or backdate it", async () => {
      const { data: draft } = await alice.db.from("submissions").select("id, status").eq("status", "in_progress").limit(1).single();
      const reviewed = await alice.db.from("submissions").update({ status: "reviewed" }).eq("id", draft!.id);
      expect(reviewed.error).not.toBeNull();
      const backdated = await alice.db.from("submissions").update({ submitted_at: "2020-01-01T00:00:00Z" }).eq("id", draft!.id);
      expect(backdated.error).not.toBeNull();
      const { data: after } = await admin.from("submissions").select("status").eq("id", draft!.id).single();
      expect(after?.status).toBe("in_progress");
    });

    it("cannot edit a submission once it has been reviewed", async () => {
      const { data: done } = await alice.db.from("submissions").select("id, notes").eq("status", "reviewed").limit(1).single();
      await alice.db.from("submissions").update({ notes: "changed after review" }).eq("id", done!.id);
      const { data: after } = await admin.from("submissions").select("notes, status").eq("id", done!.id).single();
      expect(after).toEqual({ notes: done!.notes, status: "reviewed" });
    });

    it("cannot write course content, feedback or announcements", async () => {
      const { data: lesson } = await alice.db.from("lessons").select("id, title").limit(1).single();
      await alice.db.from("lessons").update({ title: "Hacked" }).eq("id", lesson!.id);
      const { data: after } = await admin.from("lessons").select("title").eq("id", lesson!.id).single();
      expect(after?.title).toBe(lesson!.title);

      expect((await alice.db.from("announcements").insert({ course_id: courseId, title: "x", body_md: "x" })).error).not.toBeNull();
      expect(
        (await alice.db.from("feedback").insert({ course_id: courseId, student_id: alice.id, kind: "general", title: "A+", body_md: "x" })).error,
      ).not.toBeNull();
      await alice.db.from("enrollments").update({ status: "completed" }).eq("user_id", alice.id);
      const { data: enrolment } = await admin.from("enrollments").select("status").eq("user_id", alice.id).single();
      expect(enrolment?.status).toBe("active");
    });

    it("does not see unpublished lessons", async () => {
      const { data: module_ } = await admin.from("modules").select("id").eq("course_id", courseId).order("position").limit(1).single();
      const { data: hidden, error } = await admin
        .from("lessons")
        .insert({ course_id: courseId, module_id: module_!.id, slug: "rls-test-draft", title: "Draft", position: 900, is_published: false })
        .select("id")
        .single();
      expect(error).toBeNull();
      cleanup.push(() => admin.from("lessons").delete().eq("id", hidden!.id));

      expect((await alice.db.from("lessons").select("id").eq("id", hidden!.id)).data).toEqual([]);
      expect((await alice.db.from("lesson_progress").insert({ user_id: alice.id, lesson_id: hidden!.id })).error).not.toBeNull();
      expect((await instructor.db.from("lessons").select("id").eq("id", hidden!.id)).data).toHaveLength(1);
    });
  });

  describe("module locks", () => {
    it("exposes previews but blocks locked bodies, questions, resources and progress writes", async () => {
      const { data: module_ } = await admin.from("modules").select("id").eq("course_id", courseId).eq("position", 2).single();
      const { data: lesson } = await admin.from("lessons").select("id").eq("module_id", module_!.id).limit(1).single();
      const { data: quiz } = await admin.from("quizzes").select("id").eq("module_id", module_!.id).limit(1).single();
      expect((await bob.db.from("lesson_outline").select("id").eq("id", lesson!.id)).data).toHaveLength(1);
      expect((await bob.db.from("lesson_outline").select("body_md")).error).not.toBeNull();
      expect((await bob.db.from("lessons").select("*").eq("id", lesson!.id)).data).toEqual([]);
      expect((await bob.db.from("questions").select("*").eq("quiz_id", quiz!.id)).data).toEqual([]);
      expect((await bob.db.from("resources").select("*").eq("module_id", module_!.id)).data).toEqual([]);
      expect((await bob.db.from("lesson_progress").insert({ user_id: bob.id, lesson_id: lesson!.id })).error).not.toBeNull();
      expect((await anon.from("lesson_outline").select("*")).error).not.toBeNull();
      expect((await instructor.db.from("lessons").select("id").eq("id", lesson!.id)).data).toHaveLength(1);
    });

    it("date gates apply even when prerequisites are complete", async () => {
      const { data: mod } = await admin.from("modules").select("id,available_from").eq("course_id", courseId).eq("position", 1).single();
      try {
        await admin.from("modules").update({ available_from: "2099-01-01T00:00:00Z" }).eq("id", mod!.id);
        expect((await alice.db.from("lessons").select("id").eq("module_id", mod!.id)).data).toEqual([]);
        expect((await alice.db.from("lesson_outline").select("id").eq("module_id", mod!.id)).data!.length).toBeGreaterThan(0);
      } finally {
        await admin.from("modules").update({ available_from: mod!.available_from }).eq("id", mod!.id);
      }
    });

    it("paused enrolments lose previews, content and submission editing without losing history", async () => {
      const { data: target } = await admin.from("submissions").select("id,notes").eq("user_id", bob.id).limit(1).single();
      try {
        await admin.from("enrollments").update({ status: "paused" }).eq("user_id", bob.id).eq("course_id", courseId);
        expect((await bob.db.from("lesson_outline").select("id").eq("course_id", courseId)).data).toEqual([]);
        expect((await bob.db.from("lessons").select("id").eq("course_id", courseId)).data).toEqual([]);
        await bob.db.from("submissions").update({ notes: "changed while paused" }).eq("id", target!.id);
        expect((await admin.from("submissions").select("notes").eq("id", target!.id).single()).data?.notes).toBe(target!.notes);
        expect((await bob.db.from("lesson_progress").select("lesson_id")).data!.length).toBeGreaterThan(0);
      } finally {
        await admin.from("enrollments").update({ status: "active" }).eq("user_id", bob.id).eq("course_id", courseId);
      }
    });
  });

  describe("search", () => {
    it("finds lessons, modules, projects and resources for an enrolled student", async () => {
      const { data, error } = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: "stability" });
      expect(error).toBeNull();
      expect(data!.some((row) => row.kind === "lesson" && row.slug === "stability-and-cfl")).toBe(true);

      const kinds = new Set<string>();
      for (const query of ["numerical", "heat", "reference sheet", "neural"]) {
        const result = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: query });
        for (const row of result.data ?? []) kinds.add(row.kind);
      }
      expect([...kinds].sort()).toEqual(["lesson", "module", "project", "resource"]);
    });

    it("returns nothing for very short queries and survives odd input", async () => {
      expect((await alice.db.rpc("search_course", { p_course_id: courseId, p_query: "a" })).data).toEqual([]);
      for (const query of ["100%", "a_b", "'; drop table lessons; --", "\\", "((("]) {
        const { error } = await alice.db.rpc("search_course", { p_course_id: courseId, p_query: query });
        expect(error, query).toBeNull();
      }
    });
  });

  describe("an instructor", () => {
    it("can read every student's progress and the answer keys", async () => {
      const { data: progress } = await instructor.db.from("lesson_progress").select("user_id");
      const users = new Set(progress!.map((row) => row.user_id));
      expect(users.has(alice.id) && users.has(bob.id)).toBe(true);
      expect((await instructor.db.from("question_keys").select("question_id")).data!.length).toBeGreaterThan(0);
    });

    it("can leave feedback and review a submission, and the student then sees it", async () => {
      const { data: pending } = await instructor.db.from("submissions").select("id, user_id, project_id").eq("status", "submitted").limit(1).single();
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
      cleanup.push(() => admin.from("submissions").update({ status: "submitted", submitted_at: new Date(Date.now() - 6 * 86_400_000).toISOString() }).eq("id", pending!.id));

      const { data: seen } = await bob.db.from("feedback").select("title, read_at").eq("id", created!.id).single();
      expect(seen).toEqual({ title: "Integration test review", read_at: null });
      expect((await bob.db.rpc("mark_feedback_read", { p_feedback_ids: [created!.id] })).data).toBe(1);
    });
  });

  describe("database constraints", () => {
    it("rejects feedback whose kind does not match what it is attached to", async () => {
      const { error } = await admin.from("feedback").insert({ course_id: courseId, student_id: alice.id, kind: "project", title: "x", body_md: "x" });
      expect(error?.message).toMatch(/check constraint/);
    });

    it("rejects a submitted project without a link, and non-https links", async () => {
      const { data: project } = await admin.from("projects").select("id").eq("slug", "darcy-flow-surrogate").single();
      const noLink = await admin.from("submissions").insert({ project_id: project!.id, user_id: alice.id, status: "submitted" });
      expect(noLink.error?.message).toMatch(/check constraint/);
      const badLink = await admin.from("submissions").insert({ project_id: project!.id, user_id: alice.id, work_url: "javascript:alert(1)" });
      expect(badLink.error?.message).toMatch(/check constraint/);
    });

    it("keeps a lesson's course consistent with its module", async () => {
      const { data: other } = await admin.from("courses").insert({ slug: "rls-test-course", title: "Other" }).select("id").single();
      cleanup.push(() => admin.from("courses").delete().eq("id", other!.id));
      const { data: module_ } = await admin.from("modules").select("id").eq("course_id", courseId).limit(1).single();
      const { error } = await admin.from("lessons").insert({ course_id: other!.id, module_id: module_!.id, slug: "mismatch", title: "x", position: 901 });
      expect(error?.message).toMatch(/foreign key/);
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
      const { data: module_ } = await admin.from("modules").select("id").eq("course_id", courseId).eq("position", 1).single();
      const { data: quiz } = await admin
        .from("quizzes")
        .insert({ course_id: courseId, module_id: module_!.id, slug: "authoring-test-quiz", title: "Authoring test", is_published: false })
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
      const { data: other } = await admin.from("quizzes").select("id").eq("slug", "numerical-foundations-quiz").single();
      const crossed = await instructor.db.rpc("save_quiz_question", saveArgs(other!.id, first.data, "Hijacked"));
      expect(crossed.error).not.toBeNull();
      expect((await admin.from("questions").select("prompt_md").eq("id", first.data!).single()).data?.prompt_md).toBe("Edited prompt");
    });

    it("refuses students, and leaves nothing behind when it does", async () => {
      const { data: quiz } = await admin.from("quizzes").select("id").eq("slug", "numerical-foundations-quiz").single();
      const before = await admin.from("questions").select("id, position").eq("quiz_id", quiz!.id).order("position");

      const saved = await alice.db.rpc("save_quiz_question", saveArgs(quiz!.id, null, "Injected"));
      expect(saved.error?.code).toBe("42501");
      const overwritten = await alice.db.rpc("save_quiz_question", saveArgs(quiz!.id, before.data![0]!.id, "Overwritten"));
      expect(overwritten.error?.code).toBe("42501");
      expect((await alice.db.rpc("move_quiz_question", { p_question_id: before.data![0]!.id, p_direction: 1 })).error?.code).toBe("42501");

      const { data: lesson } = await admin.from("lessons").select("id").eq("slug", "finite-differences").single();
      expect((await alice.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: -1 })).error?.code).toBe("42501");
      expect((await anon.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: -1 })).error).not.toBeNull();

      const after = await admin.from("questions").select("id, position").eq("quiz_id", quiz!.id).order("position");
      expect(after.data).toEqual(before.data);
      expect((await admin.from("questions").select("id").eq("prompt_md", "Injected")).data).toEqual([]);
    });

    it("lets an instructor reorder lessons within a module", async () => {
      const order = async () =>
        (await admin.from("lessons").select("slug, module:modules!inner(position)").eq("module.position", 1).eq("course_id", courseId).order("position")).data!.map((l) => l.slug);
      const original = await order();
      const { data: lesson } = await admin.from("lessons").select("id").eq("slug", original[0]!).eq("course_id", courseId).single();

      expect((await instructor.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: 1 })).error).toBeNull();
      expect(await order()).toEqual([original[1], original[0], ...original.slice(2)]);
      expect((await instructor.db.rpc("move_lesson", { p_lesson_id: lesson!.id, p_direction: -1 })).error).toBeNull();
      expect(await order()).toEqual(original);
    });
  });
});

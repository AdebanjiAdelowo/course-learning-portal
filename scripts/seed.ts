/**
 * Loads the course defined in `seed/` into the database.
 *
 *   npm run seed            course content + demo accounts with realistic activity
 *   npm run seed:content    course content only (safe to re-run against real students)
 *
 * Content is upserted by slug, so re-running updates lessons, quizzes and projects in place
 * and never deletes student progress, attempts or submissions.
 *
 * Demo accounts are refused on anything that is not a local Supabase stack unless
 * `--allow-remote` is passed.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { course } from "../seed/course";
import type { SeedInstructor, SeedModule, SeedProblem, SeedQuestion, SeedResource } from "../seed/types";
import { gradeQuiz, toStoredResults, type AnswerKey, type AnswerValue, type SnapshotQuestion } from "../src/lib/domain/quiz";
import type { Database, Json } from "../src/lib/supabase/database.types";
import { dateInZone, zonedDateTimeToUtc } from "../src/lib/timezone";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type Db = SupabaseClient<Database>;

const args = new Set(process.argv.slice(2));
const contentOnly = args.has("--content-only");
const allowRemote = args.has("--allow-remote");

const DAY_MS = 86_400_000;
const now = Date.now();
const daysFromNow = (days: number) => new Date(now + days * DAY_MS).toISOString();

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
    process.exit(1);
  }
  return value;
}

/** Throws with context when a query fails, otherwise returns its data. */
function unwrap<T>(what: string, result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: no data returned`);
  return result.data;
}

function check(what: string, result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}

const letters = "abcdefghijklmnopqrstuvwxyz";

function questionRow(question: SeedQuestion) {
  const options =
    question.type === "multiple_choice" || question.type === "multiple_select"
      ? question.options.map((text, index) => ({ id: letters[index]!, text }))
      : [];
  let correct: Json;
  switch (question.type) {
    case "multiple_choice":
      correct = letters[question.answer]!;
      break;
    case "multiple_select":
      correct = question.answers.map((index) => letters[index]!);
      break;
    case "true_false":
      correct = question.answer;
      break;
    case "short_answer":
      correct = question.accepted;
      break;
  }
  return { options, correct, points: question.points ?? 1 };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

async function ensureUser(
  db: Db,
  input: {
    email: string;
    fullName: string;
    password: string;
    role: "student" | "instructor" | "admin";
    timezone: string;
    bio?: string;
    headline?: string;
    avatarUrl?: string;
    links?: SeedInstructor["links"];
  },
): Promise<string> {
  const list = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw new Error(`list users: ${list.error.message}`);
  let id = list.data.users.find((user) => user.email === input.email)?.id;

  if (id) {
    check(`reset password for ${input.email}`, await db.auth.admin.updateUserById(id, { password: input.password }));
  } else {
    const created = await db.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (created.error || !created.data.user) {
      throw new Error(`create ${input.email}: ${created.error?.message ?? "no user returned"}`);
    }
    id = created.data.user.id;
  }

  // The profile row is created by a database trigger; the role can only be set here, with the
  // service role, never by the user.
  check(
    `update profile of ${input.email}`,
    await db
      .from("profiles")
      .update({
        full_name: input.fullName,
        role: input.role,
        timezone: input.timezone,
        bio: input.bio ?? null,
        headline: input.headline ?? null,
        avatar_url: input.avatarUrl ?? null,
        links: input.links ?? [],
      })
      .eq("id", id),
  );
  return id;
}

// ---------------------------------------------------------------------------
// Course content
// ---------------------------------------------------------------------------

interface ContentIds {
  courseId: string;
  modules: Map<string, string>;
  lessons: Map<string, string>;
  quizzes: Map<string, string>;
  projects: Map<string, string>;
  problems: Map<string, string>;
  cohorts: Map<string, string>;
}

/** Python literal for a JSON value, as it should appear in a problem's examples. */
function pyRepr(value: unknown): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(", ")}]`;
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

interface ProblemTests {
  function: string;
  sample: { args: unknown[]; expected: unknown; explanation?: string }[];
  hidden: { args: unknown[]; expected: unknown }[];
}

function readProblemFiles(slug: string) {
  const directory = path.join("seed", "problems", slug);
  const read = (name: string) => readFileSync(path.join(directory, name), "utf8").trim();
  const tests = JSON.parse(read("tests.json")) as ProblemTests;
  const call = (args: unknown[]) => `${tests.function}(${args.map(pyRepr).join(", ")})`;
  return {
    statement: read("problem.md"),
    editorial: read("editorial.md"),
    starter: read("starter.py"),
    solution: read("solution.py"),
    examples: tests.sample.map((test) => ({
      input: call(test.args),
      output: pyRepr(test.expected),
      explanation: test.explanation ?? "",
    })),
    hiddenTests: tests.hidden.map((test) => ({ function: tests.function, args: test.args, expected: test.expected })),
  };
}

async function seedContent(db: Db, instructorId: string | null): Promise<ContentIds> {
  const courseRow = unwrap(
    "upsert course",
    await db
      .from("courses")
      .upsert(
        {
          slug: course.slug,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          level: course.level,
          duration_weeks: course.durationWeeks ?? null,
          outcomes: course.outcomes,
          prerequisites: course.prerequisites,
          is_published: true,
          ...(instructorId ? { instructor_id: instructorId } : {}),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
  );
  const courseId = courseRow.id;

  // Positions are unique per parent. Move existing rows out of the way first so that a
  // reordered seed file never collides with the old order.
  const existingModules = unwrap("read modules", await db.from("modules").select("id, position").eq("course_id", courseId));
  for (const row of existingModules) {
    check("shift module", await db.from("modules").update({ position: row.position + 10_000 }).eq("id", row.id));
  }
  const existingLessons = unwrap("read lessons", await db.from("lessons").select("id, position").eq("course_id", courseId));
  for (const row of existingLessons) {
    check("shift lesson", await db.from("lessons").update({ position: row.position + 10_000 }).eq("id", row.id));
  }

  const existingProblems = unwrap("read problems", await db.from("coding_problems").select("id, position").eq("course_id", courseId));
  for (const row of existingProblems) {
    check("shift problem", await db.from("coding_problems").update({ position: row.position + 10_000 }).eq("id", row.id));
  }
  const existingPhases = unwrap("read phases", await db.from("phases").select("id, position").eq("course_id", courseId));
  for (const row of existingPhases) {
    check("shift phase", await db.from("phases").update({ position: row.position + 10_000 }).eq("id", row.id));
  }

  const ids: ContentIds = {
    courseId,
    modules: new Map(),
    lessons: new Map(),
    quizzes: new Map(),
    projects: new Map(),
    problems: new Map(),
    cohorts: new Map(),
  };

  // Phases first, then their modules, numbered consecutively through the whole course.
  const orderedModules: { mod: SeedModule; phaseId: string }[] = [];
  for (const [phaseIndex, phase] of course.phases.entries()) {
    const phaseRow = unwrap(
      `upsert phase ${phase.slug}`,
      await db
        .from("phases")
        .upsert(
          { course_id: courseId, slug: phase.slug, title: phase.title, description: phase.description, position: phaseIndex + 1 },
          { onConflict: "course_id,slug" },
        )
        .select("id")
        .single(),
    );
    for (const mod of phase.modules) orderedModules.push({ mod, phaseId: phaseRow.id });
  }
  const resources: (SeedResource & { module_id?: string; lesson_id?: string; project_id?: string })[] = [
    ...(course.resources ?? []),
  ];

  for (const [moduleIndex, { mod, phaseId }] of orderedModules.entries()) {
    const moduleRow = unwrap(
      `upsert module ${mod.slug}`,
      await db
        .from("modules")
        .upsert(
          {
            course_id: courseId,
            slug: mod.slug,
            title: mod.title,
            description: mod.description,
            phase_id: phaseId,
            position: moduleIndex + 1,
            available_from: mod.availableInDays === undefined ? null : daysFromNow(mod.availableInDays),
            requires_previous: mod.requiresPrevious ?? true,
            is_published: mod.published ?? true,
          },
          { onConflict: "course_id,slug" },
        )
        .select("id")
        .single(),
    );
    const moduleId = moduleRow.id;
    ids.modules.set(mod.slug, moduleId);
    for (const resource of mod.resources ?? []) resources.push({ ...resource, module_id: moduleId });

    for (const [lessonIndex, lesson] of (mod.lessons ?? []).entries()) {
      const file = path.join("seed", "lessons", `${lesson.file ?? lesson.slug}.md`);
      const lessonRow = unwrap(
        `upsert lesson ${lesson.slug}`,
        await db
          .from("lessons")
          .upsert(
            {
              course_id: courseId,
              module_id: moduleId,
              slug: lesson.slug,
              title: lesson.title,
              summary: lesson.summary,
              objectives: lesson.objectives,
              body_md: readFileSync(file, "utf8").trim(),
              video_url: lesson.videoUrl ?? null,
              duration_minutes: lesson.durationMinutes,
              position: lessonIndex + 1,
              is_published: true,
            },
            { onConflict: "course_id,slug" },
          )
          .select("id")
          .single(),
      );
      ids.lessons.set(lesson.slug, lessonRow.id);
      for (const resource of lesson.resources ?? []) resources.push({ ...resource, lesson_id: lessonRow.id });
    }

    if (mod.quiz) {
      const quiz = mod.quiz;
      const quizRow = unwrap(
        `upsert quiz ${quiz.slug}`,
        await db
          .from("quizzes")
          .upsert(
            {
              course_id: courseId,
              module_id: moduleId,
              slug: quiz.slug,
              title: quiz.title,
              description: quiz.description,
              pass_percent: quiz.passPercent,
              max_attempts: quiz.maxAttempts ?? null,
              is_published: true,
            },
            { onConflict: "course_id,slug" },
          )
          .select("id")
          .single(),
      );
      ids.quizzes.set(quiz.slug, quizRow.id);

      // Questions are replaced wholesale. Past attempts keep their own snapshot of the
      // questions they answered, so history stays intact.
      check("clear questions", await db.from("questions").delete().eq("quiz_id", quizRow.id));
      for (const [questionIndex, question] of quiz.questions.entries()) {
        const { options, correct, points } = questionRow(question);
        const inserted = unwrap(
          "insert question",
          await db
            .from("questions")
            .insert({
              quiz_id: quizRow.id,
              position: questionIndex + 1,
              type: question.type,
              prompt_md: question.prompt,
              options,
              points,
            })
            .select("id")
            .single(),
        );
        check(
          "insert answer key",
          await db
            .from("question_keys")
            .insert({ question_id: inserted.id, correct: correct as NonNullable<Json>, explanation_md: question.explanation }),
        );
      }
    }

    if (mod.project) {
      const project = mod.project;
      const projectRow = unwrap(
        `upsert project ${project.slug}`,
        await db
          .from("projects")
          .upsert(
            {
              course_id: courseId,
              module_id: moduleId,
              slug: project.slug,
              title: project.title,
              summary: project.summary,
              description_md: project.description,
              objectives: project.objectives,
              requirements: project.requirements,
              submission_instructions_md: project.submissionInstructions,
              rubric: project.rubric,
              max_points: project.rubric.reduce((sum, row) => sum + row.points, 0),
              due_at: daysFromNow(project.dueInDays),
              is_published: true,
            },
            { onConflict: "course_id,slug" },
          )
          .select("id")
          .single(),
      );
      ids.projects.set(project.slug, projectRow.id);
      for (const resource of project.resources ?? []) resources.push({ ...resource, project_id: projectRow.id });
    }
    for (const [problemIndex, problem] of (mod.problems ?? []).entries()) {
      ids.problems.set(problem.slug, await upsertProblem(db, courseId, moduleId, problem, problemIndex + 1));
    }
  }

  // Resources attached to course material are owned by the seed files: replace them.
  check("clear resources", await db.from("resources").delete().eq("course_id", courseId).is("live_session_id", null));
  if (resources.length > 0) {
    check(
      "insert resources",
      await db.from("resources").insert(
        resources.map((resource, index) => ({
          course_id: courseId,
          module_id: resource.module_id ?? null,
          lesson_id: resource.lesson_id ?? null,
          project_id: resource.project_id ?? null,
          title: resource.title,
          description: resource.description ?? "",
          kind: resource.kind,
          url: resource.url,
          position: index + 1,
        })),
      ),
    );
  }

  return ids;
}

async function upsertProblem(db: Db, courseId: string, moduleId: string, problem: SeedProblem, position: number): Promise<string> {
  const files = readProblemFiles(problem.slug);
  const row = unwrap(
    `upsert problem ${problem.slug}`,
    await db
      .from("coding_problems")
      .upsert(
        {
          course_id: courseId,
          module_id: moduleId,
          slug: problem.slug,
          title: problem.title,
          summary: problem.summary,
          difficulty: problem.difficulty,
          position,
          statement_md: files.statement,
          constraints: problem.constraints,
          examples: files.examples,
          starter_code: files.starter,
          hints: problem.hints,
          is_published: true,
        },
        { onConflict: "course_id,slug" },
      )
      .select("id")
      .single(),
  );
  check(
    `upsert solution ${problem.slug}`,
    await db.from("coding_problem_solutions").upsert(
      {
        problem_id: row.id,
        editorial_md: files.editorial,
        reference_solution: files.solution,
        hidden_tests: files.hiddenTests as NonNullable<Json>,
      },
      { onConflict: "problem_id" },
    ),
  );
  return row.id;
}

/** Cohorts are upserted by slug, so re-seeding never detaches students from their cohort. */
async function seedCohorts(db: Db, ids: ContentIds): Promise<void> {
  for (const cohort of course.cohorts) {
    const startsOn = cohort.startsInDays === undefined ? null : daysFromNow(cohort.startsInDays).slice(0, 10);
    const endsOn =
      cohort.startsInDays === undefined || cohort.durationWeeks === undefined
        ? null
        : daysFromNow(cohort.startsInDays + cohort.durationWeeks * 7).slice(0, 10);
    const row = unwrap(
      `upsert cohort ${cohort.slug}`,
      await db
        .from("cohorts")
        .upsert(
          {
            course_id: ids.courseId,
            slug: cohort.slug,
            name: cohort.name,
            description: cohort.description,
            status: cohort.status,
            starts_on: startsOn,
            ends_on: endsOn,
            capacity: cohort.capacity ?? null,
            is_public: cohort.isPublic,
          },
          { onConflict: "course_id,slug" },
        )
        .select("id")
        .single(),
    );
    ids.cohorts.set(cohort.slug, row.id);
  }
}

/**
 * Live sessions and announcements can also be created in the instructor area, so the seed only
 * writes them when asked to replace (demo mode) or when the course has none yet.
 */
async function seedSchedule(db: Db, ids: ContentIds, authorId: string | null, replace: boolean): Promise<void> {
  const { courseId } = ids;
  const sessionCount = await db.from("live_sessions").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const announcementCount = await db.from("announcements").select("id", { count: "exact", head: true }).eq("course_id", courseId);

  if (replace || (sessionCount.count ?? 0) === 0) {
    check("clear sessions", await db.from("live_sessions").delete().eq("course_id", courseId));
    for (const session of course.liveSessions) {
      const day = dateInZone(new Date(now + session.startsInDays * DAY_MS), session.timezone);
      const startsAt = zonedDateTimeToUtc(`${day}T${session.startTime}`, session.timezone);
      const row = unwrap(
        "insert session",
        await db
          .from("live_sessions")
          .insert({
            course_id: courseId,
            module_id: session.moduleSlug ? (ids.modules.get(session.moduleSlug) ?? null) : null,
            cohort_id: session.cohortSlug ? (ids.cohorts.get(session.cohortSlug) ?? null) : null,
            title: session.title,
            description: session.description,
            starts_at: startsAt.toISOString(),
            ends_at: new Date(startsAt.getTime() + session.durationMinutes * 60_000).toISOString(),
            timezone: session.timezone,
            instructor_name: course.instructor.fullName,
            meeting_url: session.meetingUrl ?? null,
            recording_url: session.recordingUrl ?? null,
            slides_url: session.slidesUrl ?? null,
            notes_md: session.notes ?? "",
          })
          .select("id")
          .single(),
      );
      if (session.resources?.length) {
        check(
          "insert session resources",
          await db.from("resources").insert(
            session.resources.map((resource, index) => ({
              course_id: courseId,
              live_session_id: row.id,
              title: resource.title,
              description: resource.description ?? "",
              kind: resource.kind,
              url: resource.url,
              position: index + 1,
            })),
          ),
        );
      }
    }
  }

  if (replace || (announcementCount.count ?? 0) === 0) {
    check("clear announcements", await db.from("announcements").delete().eq("course_id", courseId));
    check(
      "insert announcements",
      await db.from("announcements").insert(
        course.announcements.map((item) => ({
          course_id: courseId,
          author_id: authorId,
          title: item.title,
          body_md: item.body,
          pinned: item.pinned ?? false,
          published_at: daysFromNow(-item.publishedDaysAgo),
        })),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Demo activity
// ---------------------------------------------------------------------------

async function clearStudentActivity(db: Db, userId: string): Promise<void> {
  check("clear feedback", await db.from("feedback").delete().eq("student_id", userId));
  check("clear submissions", await db.from("submissions").delete().eq("user_id", userId));
  check("clear attempts", await db.from("quiz_attempts").delete().eq("user_id", userId));
  check("clear progress", await db.from("lesson_progress").delete().eq("user_id", userId));
  check("clear code", await db.from("code_submissions").delete().eq("user_id", userId));
}

/** Records an attempt graded by the same function the application uses. */
async function recordAttempt(
  db: Db,
  input: { quizId: string; userId: string; attemptNumber: number; wrong: number[]; daysAgo: number; passPercent: number },
): Promise<void> {
  const rows = unwrap(
    "read questions",
    await db
      .from("questions")
      .select("id, position, type, prompt_md, options, points, key:question_keys(correct, explanation_md)")
      .eq("quiz_id", input.quizId)
      .order("position"),
  );
  const questions: SnapshotQuestion[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    points: row.points,
    prompt: row.prompt_md,
    options: row.options as unknown as SnapshotQuestion["options"],
  }));
  const keys = new Map<string, AnswerKey>(
    rows.map((row) => [row.id, { correct: row.key!.correct, explanation: row.key!.explanation_md }]),
  );

  const answers: Record<string, AnswerValue> = {};
  for (const [index, row] of rows.entries()) {
    const correct = row.key!.correct;
    const miss = input.wrong.includes(index);
    if (row.type === "true_false") answers[row.id] = miss ? !correct : (correct as boolean);
    else if (row.type === "multiple_choice") {
      const options = row.options as unknown as { id: string }[];
      answers[row.id] = miss ? options.find((option) => option.id !== correct)!.id : (correct as string);
    } else if (row.type === "multiple_select") answers[row.id] = miss ? [(correct as string[])[0]!] : (correct as string[]);
    else answers[row.id] = miss ? "not sure" : (correct as string[])[0]!;
  }

  const grade = gradeQuiz(questions, keys, answers, input.passPercent);
  check(
    "insert attempt",
    await db.from("quiz_attempts").insert({
      quiz_id: input.quizId,
      user_id: input.userId,
      attempt_number: input.attemptNumber,
      answers: answers as NonNullable<Json>,
      results: toStoredResults(grade, questions) as unknown as NonNullable<Json>,
      score: grade.score,
      max_score: grade.maxScore,
      percent: grade.percent,
      passed: grade.passed,
      submitted_at: daysFromNow(-input.daysAgo),
    }),
  );
}

async function seedDemoActivity(db: Db, ids: ContentIds, people: { instructor: string; student: string; second: string }) {
  const { courseId } = ids;
  const lesson = (slug: string) => ids.lessons.get(slug)!;
  const quizId = ids.quizzes.get("correctness-and-cost-quiz")!;
  const projectId = ids.projects.get("measuring-growth")!;
  const problem = (slug: string) => ids.problems.get(slug)!;
  const cohortId = ids.cohorts.get("pilot") ?? null;

  for (const userId of [people.student, people.second]) {
    check(
      "enrol",
      await db
        .from("enrollments")
        .upsert(
          { user_id: userId, course_id: courseId, cohort_id: cohortId, status: "active", enrolled_at: daysFromNow(-24) },
          { onConflict: "user_id,course_id" },
        ),
    );
    await clearStudentActivity(db, userId);
  }

  // --- First student: four of five lessons, quiz passed on a retake, project reviewed -----
  const completed: [string, number][] = [
    ["algorithms-and-correctness", 21],
    ["counting-cost", 18],
    ["asymptotic-notation", 13],
    ["binary-search", 6],
  ];
  check(
    "insert progress",
    await db.from("lesson_progress").insert(
      completed.map(([slug, daysAgo]) => ({ user_id: people.student, lesson_id: lesson(slug), completed_at: daysFromNow(-daysAgo) })),
    ),
  );

  await recordAttempt(db, { quizId, userId: people.student, attemptNumber: 1, wrong: [2, 3, 6], daysAgo: 5, passPercent: 70 });
  await recordAttempt(db, { quizId, userId: people.student, attemptNumber: 2, wrong: [], daysAgo: 4, passPercent: 70 });

  const reviewed = unwrap(
    "insert reviewed submission",
    await db
      .from("submissions")
      .insert({
        project_id: projectId,
        user_id: people.student,
        status: "submitted",
        submitted_at: daysFromNow(-5),
        work_url: "https://github.com/example/measuring-growth",
        notes: "Counts match the formulas exactly. Timing for binary search was too noisy to say much below n = 10 000.",
      })
      .select("id")
      .single(),
  );
  check("mark reviewed", await db.from("submissions").update({ status: "reviewed", reviewed_at: daysFromNow(-3) }).eq("id", reviewed.id));

  const firstOccurrence = readProblemFiles("first-occurrence");
  const lowerBound = readProblemFiles("lower-bound");
  check(
    "insert code submissions",
    await db.from("code_submissions").insert([
      { problem_id: problem("first-occurrence"), user_id: people.student, code: firstOccurrence.solution, status: "submitted", created_at: daysFromNow(-19) },
      { problem_id: problem("is-sorted"), user_id: people.student, code: readProblemFiles("is-sorted").solution, status: "submitted", created_at: daysFromNow(-17) },
      { problem_id: problem("lower-bound"), user_id: people.student, code: lowerBound.starter, status: "draft", created_at: daysFromNow(-2) },
    ]),
  );

  check(
    "insert feedback",
    await db.from("feedback").insert([
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "project",
        project_id: projectId,
        submission_id: reviewed.id,
        title: "Project 1 review: careful measurements",
        body_md: String.raw`Your comparison counts agree with the derived formulas for every size you tried, and you constructed the worst cases deliberately instead of searching for them. That is the core of the project.

**What went well**

- Each implementation is tested against a trusted method on all small inputs before any measurement is taken.
- The worst case for binary search is obtained by searching for an absent value larger than every element, with the reason stated.

**To improve**

1. The random trials are not seeded, so the averages cannot be reproduced exactly. Fix the seed and report it.
2. The timing discussion stops at "too noisy". Say *why*: for $n = 10^4$ binary search performs about 14 iterations, far below the resolution of a single timer reading. Repeating the call many times, as the timeit module does, would have given a usable figure.

| Criterion | Points |
| --- | --- |
| Correctness | 25 / 25 |
| Experimental method | 18 / 25 |
| Analysis | 24 / 30 |
| Presentation | 17 / 20 |`,
        score: 84,
        max_score: 100,
        read_at: daysFromNow(-2.5),
        created_at: daysFromNow(-3),
      },
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "quiz",
        quiz_id: quizId,
        title: "On your Module 1 assessment",
        body_md: String.raw`A clear improvement on the retake. On the first attempt you missed the question on what a loop invariant must satisfy. Remember that an invariant is still **true** when the loop ends: the proof uses it together with the exit condition, as in binary search, where $lo > hi$ and the invariant together give "not present".`,
        created_at: daysFromNow(-2),
      },
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "general",
        title: "Before you start insertion sort",
        body_md:
          "You are one lesson from finishing the module. When you reach the section on inversions, work the small example by hand before running the visualization: predicting the number of shifts first is what makes the result stick.",
        created_at: daysFromNow(-1),
      },
    ]),
  );

  // --- Second student: same lessons, quiz not yet passed, project waiting for review ------
  check(
    "insert second progress",
    await db.from("lesson_progress").insert(
      completed.map(([slug, daysAgo]) => ({ user_id: people.second, lesson_id: lesson(slug), completed_at: daysFromNow(-daysAgo + 1) })),
    ),
  );
  await recordAttempt(db, { quizId, userId: people.second, attemptNumber: 1, wrong: [0, 1, 4, 5], daysAgo: 3, passPercent: 70 });
  check(
    "insert pending submission",
    await db.from("submissions").insert({
      project_id: projectId,
      user_id: people.second,
      status: "submitted",
      submitted_at: daysFromNow(-1),
      work_url: "https://github.com/example/growth-study",
      notes: "My insertion sort counts are one higher than the formula for some inputs and I could not find out why.",
    }),
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const db: Db = createClient<Database>(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);
  const summary = (ids: ContentIds) =>
    `Done: ${course.phases.length} phases, ${ids.modules.size} modules (${ids.lessons.size} lessons, ${ids.quizzes.size} quizzes, ${ids.projects.size} projects and ${ids.problems.size} coding problems in the published ones).`;

  if (contentOnly) {
    console.log(`Syncing course content to ${url}`);
    const ids = await seedContent(db, null);
    await seedCohorts(db, ids);
    await seedSchedule(db, ids, null, false);
    console.log(summary(ids));
    return;
  }

  if (!isLocal && !allowRemote) {
    console.error(
      "Refusing to create demo accounts on a remote project. Use `npm run seed:content` to load only the course,\nor pass --allow-remote if you really want the demo accounts there.",
    );
    process.exit(1);
  }

  const password = env("SEED_DEMO_PASSWORD");
  if (password.length < 10) {
    console.error("SEED_DEMO_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  console.log(`Seeding the course and demo accounts into ${url}`);
  const instructor = await ensureUser(db, {
    email: course.instructor.email,
    fullName: course.instructor.fullName,
    password,
    role: "instructor",
    timezone: course.instructor.timezone,
    bio: course.instructor.bio,
    headline: course.instructor.headline,
    avatarUrl: course.instructor.avatarUrl,
    links: course.instructor.links,
  });
  const student = await ensureUser(db, { email: "student@example.com", fullName: "Amina Yusuf", password, role: "student", timezone: "Europe/Rome" });
  const second = await ensureUser(db, { email: "student2@example.com", fullName: "Lukas Weber", password, role: "student", timezone: "Europe/Berlin" });

  const ids = await seedContent(db, instructor);
  await seedCohorts(db, ids);
  await seedSchedule(db, ids, instructor, true);
  await seedDemoActivity(db, ids, { instructor, student, second });

  console.log(summary(ids));
  console.log("\nDemo accounts (password: the value of SEED_DEMO_PASSWORD)");
  console.log("  student@example.com      student, one lesson from finishing Module 1");
  console.log("  student2@example.com     student, quiz not yet passed, project awaiting review");
  console.log(`  ${course.instructor.email}   instructor`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

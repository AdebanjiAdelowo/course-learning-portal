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
import type { SeedQuestion, SeedResource } from "../seed/types";
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
  input: { email: string; fullName: string; password: string; role: "student" | "instructor" | "admin"; timezone: string; bio?: string },
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
      .update({ full_name: input.fullName, role: input.role, timezone: input.timezone, bio: input.bio ?? null })
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
          duration_weeks: course.durationWeeks,
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

  const ids: ContentIds = { courseId, modules: new Map(), lessons: new Map(), quizzes: new Map(), projects: new Map() };
  const resources: (SeedResource & { module_id?: string; lesson_id?: string; project_id?: string })[] = [
    ...(course.resources ?? []),
  ];

  for (const [moduleIndex, mod] of course.modules.entries()) {
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
            position: moduleIndex + 1,
            available_from: mod.availableInDays === undefined ? null : daysFromNow(mod.availableInDays),
            requires_previous: mod.requiresPrevious ?? true,
            is_published: true,
          },
          { onConflict: "course_id,slug" },
        )
        .select("id")
        .single(),
    );
    const moduleId = moduleRow.id;
    ids.modules.set(mod.slug, moduleId);
    for (const resource of mod.resources ?? []) resources.push({ ...resource, module_id: moduleId });

    for (const [lessonIndex, lesson] of mod.lessons.entries()) {
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
  const quiz = (slug: string) => ids.quizzes.get(slug)!;
  const project = (slug: string) => ids.projects.get(slug)!;

  for (const userId of [people.student, people.second]) {
    check(
      "enrol",
      await db
        .from("enrollments")
        .upsert(
          { user_id: userId, course_id: courseId, status: "active", enrolled_at: daysFromNow(-24) },
          { onConflict: "user_id,course_id" },
        ),
    );
    await clearStudentActivity(db, userId);
  }

  // --- First student: Module 1 finished, part-way through Module 2 -----------------------
  const completed: [string, number][] = [
    ["differential-equations-as-models", 22],
    ["finite-differences", 20],
    ["stability-and-cfl", 17],
    ["universal-approximation", 6],
    ["automatic-differentiation", 3],
  ];
  check(
    "insert progress",
    await db.from("lesson_progress").insert(
      completed.map(([slug, daysAgo]) => ({ user_id: people.student, lesson_id: lesson(slug), completed_at: daysFromNow(-daysAgo) })),
    ),
  );

  const firstQuiz = quiz("numerical-foundations-quiz");
  await recordAttempt(db, { quizId: firstQuiz, userId: people.student, attemptNumber: 1, wrong: [2, 3], daysAgo: 16, passPercent: 70 });
  await recordAttempt(db, { quizId: firstQuiz, userId: people.student, attemptNumber: 2, wrong: [], daysAgo: 15, passPercent: 70 });

  const reviewed = unwrap(
    "insert reviewed submission",
    await db
      .from("submissions")
      .insert({
        project_id: project("verified-heat-solver"),
        user_id: people.student,
        status: "submitted",
        submitted_at: daysFromNow(-12),
        work_url: "https://github.com/example/heat-equation-solver",
        notes: "Convergence table is in the README. I was unsure whether to measure the error at t = 0.1 or after a fixed number of steps.",
      })
      .select("id")
      .single(),
  );
  check("mark reviewed", await db.from("submissions").update({ status: "reviewed", reviewed_at: daysFromNow(-4) }).eq("id", reviewed.id));

  check(
    "insert draft submission",
    await db.from("submissions").insert({
      project_id: project("fit-a-function-and-its-derivative"),
      user_id: people.student,
      status: "in_progress",
      work_url: "https://github.com/example/spectral-bias-experiment",
      notes: "Baseline is trained. Fourier features still to do.",
    }),
  );

  check(
    "insert feedback",
    await db.from("feedback").insert([
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "project",
        project_id: project("verified-heat-solver"),
        submission_id: reviewed.id,
        title: "Project 1 review: a convincing convergence study",
        body_md: String.raw`Strong work. The convergence table is exactly what the brief asked for: four grids, the observed order between each pair, and the norm stated.

**What went well**

- Observed order of 2.00 to three digits, with $r$ held fixed across grids.
- The stability experiment brackets the limit tightly ($r = 0.50$ stable, $r = 0.51$ growing).

**To improve**

1. You measured the error after a fixed *number of steps*, so each grid was compared at a different physical time. Measure at a fixed final time instead: the order you report is then unambiguous.
2. The README lists the commands but not the Python and NumPy versions.

| Criterion | Points |
| --- | --- |
| Correctness | 28 / 30 |
| Convergence study | 24 / 30 |
| Stability experiment | 19 / 20 |
| Reproducibility | 15 / 20 |`,
        score: 86,
        max_score: 100,
        read_at: daysFromNow(-3.5),
        created_at: daysFromNow(-4),
      },
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "quiz",
        quiz_id: firstQuiz,
        title: "On your Module 1 quiz retake",
        body_md: String.raw`Good recovery on the second attempt. The question you missed first time, the FTCS limit, is worth being able to derive rather than remember: substitute a Fourier mode and require $|G| \le 1$. It comes back in Module 4 when we look at rollout stability.`,
        created_at: daysFromNow(-2),
      },
      {
        course_id: courseId,
        student_id: people.student,
        author_id: people.instructor,
        kind: "general",
        title: "Mid-course check-in",
        body_md:
          "You are on schedule and your written explanations are clear. For Project 2, plan the evaluation grid and the seeds **before** you train anything. It makes the comparison much easier to defend.",
        created_at: daysFromNow(-1),
      },
    ]),
  );

  // --- Second student: just starting, with one project waiting for review ---------------
  check(
    "insert second progress",
    await db.from("lesson_progress").insert([
      { user_id: people.second, lesson_id: lesson("differential-equations-as-models"), completed_at: daysFromNow(-12) },
      { user_id: people.second, lesson_id: lesson("finite-differences"), completed_at: daysFromNow(-8) },
    ]),
  );
  await recordAttempt(db, { quizId: firstQuiz, userId: people.second, attemptNumber: 1, wrong: [0, 1, 4], daysAgo: 7, passPercent: 70 });
  check(
    "insert pending submission",
    await db.from("submissions").insert({
      project_id: project("verified-heat-solver"),
      user_id: people.second,
      status: "submitted",
      submitted_at: daysFromNow(-6),
      work_url: "https://github.com/example/ftcs-heat",
      notes: "Submitted late, sorry. The order I measure is 1.6 and I could not find out why.",
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

  if (contentOnly) {
    console.log(`Syncing course content to ${url}`);
    const ids = await seedContent(db, null);
    await seedSchedule(db, ids, null, false);
    console.log(`Done: ${ids.modules.size} modules, ${ids.lessons.size} lessons, ${ids.quizzes.size} quizzes, ${ids.projects.size} projects.`);
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

  console.log(`Seeding demo course and accounts into ${url}`);
  const instructor = await ensureUser(db, {
    email: course.instructor.email,
    fullName: course.instructor.fullName,
    password,
    role: "instructor",
    timezone: course.instructor.timezone,
    bio: course.instructor.bio,
  });
  const student = await ensureUser(db, {
    email: "student@example.com",
    fullName: "Amina Yusuf",
    password,
    role: "student",
    timezone: "Europe/Rome",
    bio: "Second-year PhD student in mechanical engineering, working on heat transfer.",
  });
  const second = await ensureUser(db, {
    email: "student2@example.com",
    fullName: "Lukas Weber",
    password,
    role: "student",
    timezone: "Europe/Berlin",
  });

  const ids = await seedContent(db, instructor);
  await seedSchedule(db, ids, instructor, true);
  await seedDemoActivity(db, ids, { instructor, student, second });

  console.log(`Done: ${ids.modules.size} modules, ${ids.lessons.size} lessons, ${ids.quizzes.size} quizzes, ${ids.projects.size} projects.`);
  console.log("\nDemo accounts (password: the value of SEED_DEMO_PASSWORD)");
  console.log("  student@example.com      student, part-way through the course");
  console.log("  student2@example.com     student, just starting");
  console.log(`  ${course.instructor.email}   instructor`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

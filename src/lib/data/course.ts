import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  computeCourseProgress,
  type CourseProgress,
  type OutlineModule,
  type StudentRecord,
  type SubmissionStatus,
} from "@/lib/domain/progress";
import { summariseAttempts } from "@/lib/domain/quiz";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { requireViewer } from "./viewer";

export type Course = Tables<"courses">;

export type LessonMeta = Pick<
  Tables<"lessons">,
  "id" | "module_id" | "slug" | "title" | "summary" | "duration_minutes" | "position"
>;
export type QuizMeta = Pick<
  Tables<"quizzes">,
  "id" | "module_id" | "slug" | "title" | "description" | "pass_percent" | "max_attempts"
>;
export type ProjectMeta = Pick<
  Tables<"projects">,
  "id" | "module_id" | "slug" | "title" | "summary" | "due_at" | "max_points"
>;
export type AttemptMeta = Pick<
  Tables<"quiz_attempts">,
  "id" | "quiz_id" | "attempt_number" | "score" | "max_score" | "percent" | "passed" | "submitted_at"
>;
export type SubmissionMeta = Pick<
  Tables<"submissions">,
  "id" | "project_id" | "status" | "submitted_at" | "reviewed_at" | "updated_at"
>;

export interface CourseState {
  course: Course;
  modules: OutlineModule[];
  lessons: LessonMeta[];
  quizzes: QuizMeta[];
  projects: ProjectMeta[];
  attempts: AttemptMeta[];
  submissions: SubmissionMeta[];
  /** lesson id -> ISO timestamp of completion */
  completedAt: Map<string, string>;
  record: StudentRecord;
  progress: CourseProgress;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

/**
 * The course the viewer is working on: their most recent active enrolment. Staff who are not
 * enrolled anywhere preview the first course. Returns null when there is nothing to show.
 */
export const getActiveCourse = cache(async (): Promise<Course | null> => {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: enrolment, error } = await supabase
    .from("enrollments")
    .select("course:courses(*)")
    .eq("user_id", viewer.id)
    .in("status", ["active", "completed"])
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("your enrolment", error.message);
  if (enrolment?.course) return enrolment.course;

  if (viewer.isStaff) {
    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    return course ?? null;
  }
  return null;
});

/** Builds the pure-logic inputs from raw rows. Shared with the instructor views. */
export function buildOutline(
  modules: Pick<
    Tables<"modules">,
    "id" | "slug" | "title" | "description" | "position" | "available_from" | "requires_previous"
  >[],
  lessons: LessonMeta[],
  quizzes: QuizMeta[],
  projects: ProjectMeta[],
): OutlineModule[] {
  return [...modules]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      description: m.description,
      position: m.position,
      availableFrom: m.available_from,
      requiresPrevious: m.requires_previous,
      lessons: lessons
        .filter((l) => l.module_id === m.id)
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          durationMinutes: l.duration_minutes,
          position: l.position,
        })),
      quizzes: quizzes
        .filter((q) => q.module_id === m.id)
        .map((q) => ({ id: q.id, slug: q.slug, title: q.title, passPercent: q.pass_percent })),
      projects: projects
        .filter((p) => p.module_id === m.id)
        .map((p) => ({ id: p.id, slug: p.slug, title: p.title, dueAt: p.due_at })),
    }));
}

export function buildRecord(
  completedLessonIds: Iterable<string>,
  attempts: Pick<AttemptMeta, "quiz_id" | "percent" | "passed">[],
  submissions: Pick<SubmissionMeta, "project_id" | "status">[],
): StudentRecord {
  const byQuiz = new Map<string, { percent: number; passed: boolean }[]>();
  for (const attempt of attempts) {
    const list = byQuiz.get(attempt.quiz_id) ?? [];
    list.push({ percent: Number(attempt.percent), passed: attempt.passed });
    byQuiz.set(attempt.quiz_id, list);
  }
  const quizStandings = new Map(
    [...byQuiz].flatMap(([quizId, list]) => {
      const summary = summariseAttempts(list);
      return summary ? [[quizId, summary] as const] : [];
    }),
  );
  const projectStatuses = new Map<string, SubmissionStatus>(
    submissions.map((s) => [s.project_id, s.status]),
  );
  return { completedLessonIds: new Set(completedLessonIds), quizStandings, projectStatuses };
}

/**
 * Everything needed to answer "where am I in this course?": the published outline plus the
 * viewer's own progress, attempts and submissions. One round of parallel queries per request.
 */
export const getCourseState = cache(async (): Promise<CourseState | null> => {
  const viewer = await requireViewer();
  const course = await getActiveCourse();
  if (!course) return null;

  const supabase = await createClient();
  const [modules, lessons, quizzes, projects, progressRows, attempts, submissions] =
    await Promise.all([
      supabase
        .from("modules")
        .select("id, slug, title, description, position, available_from, requires_previous")
        .eq("course_id", course.id)
        .eq("is_published", true)
        .order("position"),
      supabase
        .from("lesson_outline")
        .select("id, module_id, slug, title, summary, duration_minutes, position")
        .eq("course_id", course.id)
        .order("position"),
      supabase
        .from("quiz_outline")
        .select("id, module_id, slug, title, description, pass_percent, max_attempts")
        .eq("course_id", course.id)
        .order("title"),
      supabase
        .from("project_outline")
        .select("id, module_id, slug, title, summary, due_at, max_points")
        .eq("course_id", course.id)
        .order("due_at", { nullsFirst: false }),
      // Staff can read every student's rows, so always scope to the viewer explicitly.
      supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", viewer.id),
      supabase
        .from("quiz_attempts")
        .select("id, quiz_id, attempt_number, score, max_score, percent, passed, submitted_at")
        .eq("user_id", viewer.id)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("submissions")
        .select("id, project_id, status, submitted_at, reviewed_at, updated_at")
        .eq("user_id", viewer.id),
    ]);

  if (modules.error) fail("modules", modules.error.message);
  if (lessons.error) fail("lessons", lessons.error.message);
  if (quizzes.error) fail("quizzes", quizzes.error.message);
  if (projects.error) fail("projects", projects.error.message);
  if (progressRows.error) fail("your progress", progressRows.error.message);
  if (attempts.error) fail("your quiz attempts", attempts.error.message);
  if (submissions.error) fail("your submissions", submissions.error.message);

  const publishedModuleIds = new Set(modules.data.map((m) => m.id));
  // The preview views project non-null base columns; Postgres view introspection
  // conservatively marks every column nullable. Base-table constraints still apply.
  const visibleLessons = (lessons.data as LessonMeta[]).filter((l) => publishedModuleIds.has(l.module_id));
  const visibleQuizzes = (quizzes.data as QuizMeta[]).filter((q) => publishedModuleIds.has(q.module_id));
  const visibleProjects = (projects.data as ProjectMeta[]).filter((p) => publishedModuleIds.has(p.module_id));
  const lessonIds = new Set(visibleLessons.map((l) => l.id));
  const quizIds = new Set(visibleQuizzes.map((q) => q.id));
  const projectIds = new Set(visibleProjects.map((p) => p.id));

  const outline = buildOutline(modules.data, visibleLessons, visibleQuizzes, visibleProjects);
  const courseProgress = progressRows.data.filter((row) => lessonIds.has(row.lesson_id));
  const courseAttempts = attempts.data.filter((a) => quizIds.has(a.quiz_id));
  const courseSubmissions = submissions.data.filter((s) => projectIds.has(s.project_id));
  const record = buildRecord(
    courseProgress.map((row) => row.lesson_id),
    courseAttempts,
    courseSubmissions,
  );

  return {
    course,
    modules: outline,
    lessons: visibleLessons,
    quizzes: visibleQuizzes,
    projects: visibleProjects,
    attempts: courseAttempts,
    submissions: courseSubmissions,
    completedAt: new Map(courseProgress.map((row) => [row.lesson_id, row.completed_at])),
    record,
    progress: computeCourseProgress(outline, record, { ignoreLocks: viewer.isStaff }),
  };
});

/** For portal pages: the course state, or a redirect when the viewer has no course. */
export async function requireCourseState(): Promise<CourseState> {
  const state = await getCourseState();
  if (!state) redirect("/learn/not-enrolled");
  return state;
}

export const getUnreadFeedbackCount = cache(async (): Promise<number> => {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("student_id", viewer.id)
    .is("read_at", null);
  return count ?? 0;
});

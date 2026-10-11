import "server-only";

import { cache } from "react";

import { siteConfig } from "@/config/site";
import { moduleLabels, type ModuleLabel } from "@/lib/domain/path";
import { computeCourseProgress, type CourseProgress, type OutlineModule } from "@/lib/domain/progress";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { buildOutline, buildRecord, type Course } from "./course";
import { requireStaff } from "./viewer";

/** Matches no row; used so queries stay valid when there is no course yet. */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export interface StudentProgress {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "timezone" | "bio">;
  enrolledAt: string;
  status: Tables<"enrollments">["status"];
  progress: CourseProgress;
  lastActivity: string | null;
}

export interface Cohort {
  course: Course;
  outline: OutlineModule[];
  students: StudentProgress[];
}

/**
 * The course the instructor area manages: the one named by the configured slug, the same course
 * the public website and the student portal use. Other courses in the database are ignored.
 */
export const getAdminCourse = cache(async (): Promise<Course | null> => {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("*").eq("slug", siteConfig.courseSlug).maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data;
});

export interface AdminModuleLabels {
  bySlug: Map<string, ModuleLabel>;
  byId: Map<string, ModuleLabel>;
  /** "DSA Module 1: Title", for select options and headings. */
  describe: (module: { id: string; title: string; position: number }) => string;
}

/** Display numbers of every module of the managed course, published or planned. */
export const getModuleLabels = cache(async (): Promise<AdminModuleLabels> => {
  const course = await getAdminCourse();
  const supabase = await createClient();
  const [phases, modules] = await Promise.all([
    supabase.from("phases").select("id, is_preparatory").eq("course_id", course?.id ?? NIL_UUID),
    supabase.from("modules").select("id, slug, position, phase_id").eq("course_id", course?.id ?? NIL_UUID),
  ]);
  const bySlug = moduleLabels(
    (phases.data ?? []).map((phase) => ({ id: phase.id, isPreparatory: phase.is_preparatory })),
    (modules.data ?? []).map((mod) => ({ slug: mod.slug, position: mod.position, phaseId: mod.phase_id })),
  );
  const byId = new Map((modules.data ?? []).flatMap((mod) => (bySlug.has(mod.slug) ? [[mod.id, bySlug.get(mod.slug)!] as const] : [])));
  return {
    bySlug,
    byId,
    describe: (mod) => `${byId.get(mod.id)?.text ?? `Module ${mod.position}`}: ${mod.title}`,
  };
});

/**
 * Progress of every enrolled student, computed with exactly the same function the students'
 * own dashboards use, so the two views can never disagree.
 */
export const getCohort = cache(async (): Promise<Cohort | null> => {
  const course = await getAdminCourse();
  if (!course) return null;
  const supabase = await createClient();

  const [modules, lessons, quizzes, projects, enrolments] = await Promise.all([
    supabase
      .from("modules")
      .select("id, slug, title, description, position, available_from, requires_previous")
      .eq("course_id", course.id)
      .eq("is_published", true),
    supabase
      .from("lessons")
      .select("id, module_id, slug, title, summary, duration_minutes, position")
      .eq("course_id", course.id)
      .eq("is_published", true),
    supabase
      .from("quizzes")
      .select("id, module_id, slug, title, description, pass_percent, max_attempts")
      .eq("course_id", course.id)
      .eq("is_published", true),
    supabase
      .from("projects")
      .select("id, module_id, slug, title, summary, due_at, max_points")
      .eq("course_id", course.id)
      .eq("is_published", true),
    supabase
      .from("enrollments")
      .select("status, enrolled_at, profile:profiles(id, full_name, email, timezone, bio, role)")
      .eq("course_id", course.id)
      .order("enrolled_at"),
  ]);
  for (const result of [modules, lessons, quizzes, projects, enrolments]) {
    if (result.error) throw new Error(`Could not load cohort data: ${result.error.message}`);
  }

  const moduleIds = new Set((modules.data ?? []).map((m) => m.id));
  const courseLessons = (lessons.data ?? []).filter((l) => moduleIds.has(l.module_id));
  const courseQuizzes = (quizzes.data ?? []).filter((q) => moduleIds.has(q.module_id));
  const courseProjects = (projects.data ?? []).filter((p) => moduleIds.has(p.module_id));
  const outline = buildOutline(modules.data ?? [], courseLessons, courseQuizzes, courseProjects, (await getModuleLabels()).bySlug);

  const studentIds = (enrolments.data ?? []).map((e) => e.profile.id);
  const lessonIds = courseLessons.map((l) => l.id);
  const quizIds = courseQuizzes.map((q) => q.id);
  const projectIds = courseProjects.map((p) => p.id);

  const none = { data: [], error: null };
  const [progressRows, attempts, submissions] = await Promise.all([
    studentIds.length && lessonIds.length
      ? supabase.from("lesson_progress").select("user_id, lesson_id, completed_at").in("user_id", studentIds).in("lesson_id", lessonIds)
      : none,
    studentIds.length && quizIds.length
      ? supabase.from("quiz_attempts").select("user_id, quiz_id, percent, passed, submitted_at").in("user_id", studentIds).in("quiz_id", quizIds)
      : none,
    studentIds.length && projectIds.length
      ? supabase.from("submissions").select("user_id, project_id, status, updated_at").in("user_id", studentIds).in("project_id", projectIds)
      : none,
  ]);
  for (const result of [progressRows, attempts, submissions]) {
    if (result.error) throw new Error(`Could not load student activity: ${result.error.message}`);
  }

  const students = (enrolments.data ?? [])
    .filter((e) => e.profile.role === "student")
    .map((enrolment): StudentProgress => {
      const id = enrolment.profile.id;
      const mine = {
        progress: (progressRows.data ?? []).filter((row) => row.user_id === id),
        attempts: (attempts.data ?? []).filter((row) => row.user_id === id),
        submissions: (submissions.data ?? []).filter((row) => row.user_id === id),
      };
      const record = buildRecord(
        mine.progress.map((row) => row.lesson_id),
        mine.attempts,
        mine.submissions,
      );
      const stamps = [
        ...mine.progress.map((row) => row.completed_at),
        ...mine.attempts.map((row) => row.submitted_at),
        ...mine.submissions.map((row) => row.updated_at),
      ].sort();
      return {
        profile: enrolment.profile,
        enrolledAt: enrolment.enrolled_at,
        status: enrolment.status,
        progress: computeCourseProgress(outline, record),
        lastActivity: stamps[stamps.length - 1] ?? null,
      };
    });

  return { course, outline, students };
});

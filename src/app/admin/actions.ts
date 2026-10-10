"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { getAdminCourse } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/timezone";
import {
  announcementSchema,
  generalFeedbackSchema,
  invalidState,
  lessonSchema,
  liveSessionSchema,
  moduleSchema,
  moduleUpdateSchema,
  reviewSchema,
  type FormState,
} from "@/lib/validation";

/**
 * Instructor actions. Each one checks the caller's role first; row-level security then
 * enforces the same rule in the database, so a forged request from a student fails twice.
 */

const failed = (message: string): FormState => ({ status: "error", message });

function duplicateMessage(code: string | undefined, fallback: string): string {
  return code === "23505" ? "That slug is already used in this course. Choose another." : fallback;
}

async function courseOrFail() {
  const course = await getAdminCourse();
  if (!course) throw new Error(`No course with the slug "${siteConfig.courseSlug}" exists yet. Run the seed script first.`);
  return course;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/");
}

export async function reviewSubmission(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const parsed = reviewSchema.safeParse({
    submission_id: formData.get("submission_id"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    score: formData.get("score") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, status, user_id, project:projects(id, course_id, max_points)")
    .eq("id", parsed.data.submission_id)
    .maybeSingle();
  if (error || !submission) return failed("That submission could not be found.");
  if (submission.status === "in_progress") return failed("This is still a draft. The student has not submitted it.");

  const { score } = parsed.data;
  if (score !== null && score > submission.project.max_points) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: { score: [`The maximum is ${submission.project.max_points}.`] } };
  }

  const { error: feedbackError } = await supabase.from("feedback").insert({
    course_id: submission.project.course_id,
    student_id: submission.user_id,
    author_id: viewer.id,
    kind: "project",
    project_id: submission.project.id,
    submission_id: submission.id,
    title: parsed.data.title,
    body_md: parsed.data.body_md,
    score,
    max_score: score === null ? null : submission.project.max_points,
  });
  if (feedbackError) return failed("The feedback could not be saved. Please try again.");

  const { error: statusError } = await supabase.from("submissions").update({ status: "reviewed" }).eq("id", submission.id);
  if (statusError) return failed("Feedback was saved, but the submission could not be marked as reviewed.");

  refresh();
  return { status: "success", message: "Feedback sent. The student will see it on their dashboard." };
}

export async function sendGeneralFeedback(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const parsed = generalFeedbackSchema.safeParse({
    student_id: formData.get("student_id"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const course = await courseOrFail();
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    course_id: course.id,
    student_id: parsed.data.student_id,
    author_id: viewer.id,
    kind: "general",
    title: parsed.data.title,
    body_md: parsed.data.body_md,
  });
  if (error) return failed("The feedback could not be saved. Please try again.");

  refresh();
  return { status: "success", message: "Feedback sent." };
}

export async function createModule(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    requires_previous: formData.get("requires_previous"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const course = await courseOrFail();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("modules")
    .select("position")
    .eq("course_id", course.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A new module starts as planned: it has no lessons yet, and students should not be shown
  // an empty module as available. Publish it from its edit page once it has content.
  const { error } = await supabase.from("modules").insert({
    ...parsed.data,
    course_id: course.id,
    is_published: false,
    position: (last?.position ?? 0) + 1,
  });
  if (error) return failed(duplicateMessage(error.code, "The module could not be created."));

  refresh();
  return {
    status: "success",
    message: `Module "${parsed.data.title}" added at the end of the course as planned. Add lessons, then publish it from "Edit module".`,
  };
}

/**
 * Renames a module, edits its description, assigns its phase, and publishes or unpublishes it.
 * The slug is deliberately not editable: links, seed files and prerequisites refer to it.
 * Nothing is deleted; unpublishing hides a module from students and keeps their progress.
 */
export async function updateModule(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = moduleUpdateSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    phase_id: formData.get("phase_id") ?? "",
    requires_previous: formData.get("requires_previous"),
    is_published: formData.get("is_published"),
  });
  if (!parsed.success) return invalidState(parsed.error);
  const { module_id, phase_id, is_published, ...rest } = parsed.data;

  const course = await courseOrFail();
  const supabase = await createClient();

  // Ids from the browser are never trusted: the phase must belong to the managed course.
  if (phase_id) {
    const { data: phase } = await supabase.from("phases").select("id").eq("id", phase_id).eq("course_id", course.id).maybeSingle();
    if (!phase) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: { phase_id: ["Choose a phase from this course."] } };
  }

  if (is_published) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("module_id", module_id)
      .eq("is_published", true);
    if (!count) {
      return {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: { is_published: ["Publish at least one lesson in this module first. Until then it stays on the path as planned."] },
      };
    }
  }

  const { data, error } = await supabase
    .from("modules")
    .update({ ...rest, phase_id, is_published })
    .eq("id", module_id)
    .eq("course_id", course.id)
    .select("id");
  if (error) return failed("The module could not be saved.");
  if (data.length === 0) return failed("That module no longer exists.");

  refresh();
  return {
    status: "success",
    message: is_published ? "Module saved. It is published and visible to enrolled students." : "Module saved. It is shown to students as planned.",
  };
}

const moveModuleSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });

/** Swaps a module with its neighbour in course order. */
export async function moveModule(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = moveModuleSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) throw new Error("Invalid request.");
  const course = await courseOrFail();
  const supabase = await createClient();
  const { data: mod } = await supabase.from("modules").select("id").eq("id", parsed.data.id).eq("course_id", course.id).maybeSingle();
  if (!mod) throw new Error("That module is not part of this course.");
  const { error } = await supabase.rpc("move_module", {
    p_module_id: mod.id,
    p_direction: parsed.data.direction === "up" ? -1 : 1,
  });
  if (error) throw new Error(`Could not move the module: ${error.message}`);
  refresh();
}

export async function saveLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = lessonSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary") ?? "",
    objectives: formData.get("objectives") ?? "",
    duration_minutes: formData.get("duration_minutes"),
    video_url: formData.get("video_url") ?? "",
    body_md: formData.get("body_md") ?? "",
    is_published: formData.get("is_published"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const lessonId = z.uuid().safeParse(formData.get("lesson_id"));
  const course = await courseOrFail();
  const supabase = await createClient();

  if (lessonId.success) {
    const { data: current } = await supabase.from("lessons").select("module_id, position").eq("id", lessonId.data).maybeSingle();
    if (!current) return failed("That lesson no longer exists.");

    let position = current.position;
    if (current.module_id !== parsed.data.module_id) {
      const { data: last } = await supabase
        .from("lessons")
        .select("position")
        .eq("module_id", parsed.data.module_id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      position = (last?.position ?? 0) + 1;
    }
    const { error } = await supabase.from("lessons").update({ ...parsed.data, position }).eq("id", lessonId.data);
    if (error) return failed(duplicateMessage(error.code, "The lesson could not be saved."));
    refresh();
    return { status: "success", message: "Lesson saved." };
  }

  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", parsed.data.module_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: created, error } = await supabase
    .from("lessons")
    .insert({ ...parsed.data, course_id: course.id, position: (last?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return failed(duplicateMessage(error.code, "The lesson could not be created."));

  refresh();
  redirect(`/admin/content/lessons/${created.id}?created=1`);
}

export async function createAnnouncement(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    pinned: formData.get("pinned"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const course = await courseOrFail();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, course_id: course.id, author_id: viewer.id });
  if (error) return failed("The announcement could not be published.");

  refresh();
  return { status: "success", message: "Announcement published to every student's dashboard." };
}

export async function createLiveSession(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = liveSessionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    instructor_name: formData.get("instructor_name"),
    timezone: formData.get("timezone"),
    starts_at: formData.get("starts_at"),
    duration_minutes: formData.get("duration_minutes"),
    meeting_url: formData.get("meeting_url") ?? "",
  });
  if (!parsed.success) return invalidState(parsed.error);

  const { starts_at, duration_minutes, ...rest } = parsed.data;
  const start = zonedDateTimeToUtc(starts_at, rest.timezone);
  const course = await courseOrFail();
  const supabase = await createClient();
  const { error } = await supabase.from("live_sessions").insert({
    ...rest,
    course_id: course.id,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + duration_minutes * 60_000).toISOString(),
  });
  if (error) return failed("The session could not be scheduled.");

  refresh();
  return { status: "success", message: "Session scheduled." };
}

const deleteSchema = z.object({ id: z.uuid(), table: z.enum(["announcements", "live_sessions"]) });

export async function deleteItem(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = deleteSchema.safeParse({ id: formData.get("id"), table: formData.get("table") });
  if (!parsed.success) throw new Error("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.from(parsed.data.table).delete().eq("id", parsed.data.id);
  if (error) throw new Error(`Could not delete: ${error.message}`);
  refresh();
}

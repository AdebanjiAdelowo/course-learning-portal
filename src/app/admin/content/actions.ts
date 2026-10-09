"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminCourse } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { parseAttachment, parseQuestion, parseRubric, rubricTotal } from "@/lib/domain/authoring";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/timezone";
import {
  invalidState,
  projectSchema,
  questionSchema,
  quizSchema,
  resourceSchema,
  type FormState,
} from "@/lib/validation";

/**
 * Authoring actions for quizzes, questions, projects and resources. Each checks the caller's
 * role; row-level security enforces the same rule in the database.
 *
 * Quizzes and projects are never deleted here, because deleting one would also delete every
 * student's attempts or submissions. Unpublish them instead.
 */

const failed = (message: string): FormState => ({ status: "error", message });
const fieldError = (field: string, message: string): FormState => ({
  status: "error",
  message: "Please check the highlighted fields.",
  fieldErrors: { [field]: [message] },
});

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/");
}

async function courseOrFail() {
  const course = await getAdminCourse();
  if (!course) throw new Error("There is no course yet. Run the seed script first.");
  return course;
}

/** The module must belong to the managed course; ids from the browser are never trusted. */
async function moduleInCourse(moduleId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id").eq("id", moduleId).eq("course_id", courseId).maybeSingle();
  return data !== null;
}

function fields(formData: FormData, names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, formData.get(name) ?? ""]));
}

// ---------------------------------------------------------------------------
// Quizzes and questions
// ---------------------------------------------------------------------------

export async function saveQuiz(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = quizSchema.safeParse({
    ...fields(formData, ["module_id", "title", "slug", "description", "pass_percent", "max_attempts"]),
    is_published: formData.get("is_published"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const course = await courseOrFail();
  if (!(await moduleInCourse(parsed.data.module_id, course.id))) return fieldError("module_id", "Choose a module from this course.");

  const supabase = await createClient();
  const quizId = z.uuid().safeParse(formData.get("quiz_id"));

  if (quizId.success) {
    if (parsed.data.is_published) {
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId.data);
      if (!count) return fieldError("is_published", "Add at least one question before publishing.");
    }
    const { data, error } = await supabase.from("quizzes").update(parsed.data).eq("id", quizId.data).eq("course_id", course.id).select("id");
    if (error) return failed(error.code === "23505" ? "That slug is already used by another quiz in this course." : "The quiz could not be saved.");
    if (data.length === 0) return failed("That quiz no longer exists.");
    refresh();
    return { status: "success", message: "Quiz saved." };
  }

  // A new quiz starts unpublished: it has no questions yet, and an empty quiz would count
  // towards every student's completion without being passable.
  const { data: created, error } = await supabase
    .from("quizzes")
    .insert({ ...parsed.data, is_published: false, course_id: course.id })
    .select("id")
    .single();
  if (error) return failed(error.code === "23505" ? "That slug is already used by another quiz in this course." : "The quiz could not be created.");
  refresh();
  redirect(`/admin/content/quizzes/${created.id}?created=1`);
}

export async function saveQuestion(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = questionSchema.safeParse(
    fields(formData, ["quiz_id", "type", "prompt_md", "options_text", "true_false", "accepted_text", "explanation_md", "points"]),
  );
  if (!parsed.success) return invalidState(parsed.error);
  const input = parsed.data;

  const question = parseQuestion({
    type: input.type,
    optionsText: input.options_text,
    trueFalse: input.true_false,
    acceptedText: input.accepted_text,
  });
  if (!question.ok) {
    const field = input.type === "true_false" ? "true_false" : input.type === "short_answer" ? "accepted_text" : "options_text";
    return fieldError(field, question.error);
  }

  const course = await courseOrFail();
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", input.quiz_id).eq("course_id", course.id).maybeSingle();
  if (!quiz) return failed("That quiz no longer exists.");

  const questionId = z.uuid().safeParse(formData.get("question_id"));
  const { error } = await supabase.rpc("save_quiz_question", {
    p_quiz_id: quiz.id,
    // The generated types cannot express a nullable argument; null means "create".
    p_question_id: (questionId.success ? questionId.data : null) as unknown as string,
    p_type: input.type,
    p_prompt_md: input.prompt_md,
    p_options: question.value.options as unknown as Json,
    p_correct: question.value.correct as Json,
    p_explanation_md: input.explanation_md,
    p_points: input.points,
  });
  if (error) return failed("The question could not be saved. Please try again.");

  refresh();
  return { status: "success", message: questionId.success ? "Question saved." : "Question added." };
}

const idSchema = z.object({ id: z.uuid() });
const moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });

export async function deleteQuestion(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("Invalid request.");
  const supabase = await createClient();

  // A published quiz must keep at least one question, or no student could pass it.
  const { data: question } = await supabase.from("questions").select("quiz_id, quiz:quizzes(is_published)").eq("id", parsed.data.id).maybeSingle();
  if (!question) return;
  if (question.quiz.is_published) {
    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", question.quiz_id);
    if ((count ?? 0) <= 1) throw new Error("A published quiz needs at least one question. Unpublish the quiz first.");
  }

  const { error } = await supabase.from("questions").delete().eq("id", parsed.data.id);
  if (error) throw new Error(`Could not delete the question: ${error.message}`);
  refresh();
}

export async function moveQuestion(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = moveSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) throw new Error("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_quiz_question", {
    p_question_id: parsed.data.id,
    p_direction: parsed.data.direction === "up" ? -1 : 1,
  });
  if (error) throw new Error(`Could not move the question: ${error.message}`);
  refresh();
}

export async function moveLesson(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = moveSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) throw new Error("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_lesson", {
    p_lesson_id: parsed.data.id,
    p_direction: parsed.data.direction === "up" ? -1 : 1,
  });
  if (error) throw new Error(`Could not move the lesson: ${error.message}`);
  refresh();
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function saveProject(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const parsed = projectSchema.safeParse({
    ...fields(formData, [
      "module_id", "title", "slug", "summary", "description_md", "objectives", "requirements",
      "submission_instructions_md", "rubric_text", "due_at",
    ]),
    is_published: formData.get("is_published"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const rubric = parseRubric(parsed.data.rubric_text);
  if (!rubric.ok) return fieldError("rubric_text", rubric.error);

  const course = await courseOrFail();
  if (!(await moduleInCourse(parsed.data.module_id, course.id))) return fieldError("module_id", "Choose a module from this course.");

  const { rubric_text: _rubricText, due_at, ...rest } = parsed.data;
  const row = {
    ...rest,
    rubric: rubric.value as unknown as NonNullable<Json>,
    max_points: rubricTotal(rubric.value),
    due_at: due_at === "" ? null : zonedDateTimeToUtc(due_at, viewer.profile.timezone).toISOString(),
  };

  const supabase = await createClient();
  const projectId = z.uuid().safeParse(formData.get("project_id"));
  const duplicate = "That slug is already used by another project in this course.";

  if (projectId.success) {
    const { data, error } = await supabase.from("projects").update(row).eq("id", projectId.data).eq("course_id", course.id).select("id");
    if (error) return failed(error.code === "23505" ? duplicate : "The project could not be saved.");
    if (data.length === 0) return failed("That project no longer exists.");
    refresh();
    return { status: "success", message: "Project saved." };
  }

  const { data: created, error } = await supabase.from("projects").insert({ ...row, course_id: course.id }).select("id").single();
  if (error) return failed(error.code === "23505" ? duplicate : "The project could not be created.");
  refresh();
  redirect(`/admin/content/projects/${created.id}?created=1`);
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export async function createResource(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = resourceSchema.safeParse(fields(formData, ["title", "description", "kind", "url", "attachment"]));
  if (!parsed.success) return invalidState(parsed.error);

  const attachment = parseAttachment(parsed.data.attachment);
  if (!attachment.ok) return fieldError("attachment", attachment.error);

  const course = await courseOrFail();
  const supabase = await createClient();
  const { kind, id } = attachment.value;

  // Confirm the target belongs to this course before attaching anything to it.
  if (id) {
    const table = ({ module: "modules", lesson: "lessons", project: "projects", session: "live_sessions" } as const)[kind as Exclude<typeof kind, "course">];
    const { data } = await supabase.from(table).select("id").eq("id", id).eq("course_id", course.id).maybeSingle();
    if (!data) return fieldError("attachment", "That item is not part of this course.");
  }

  const { data: last } = await supabase.from("resources").select("position").eq("course_id", course.id).order("position", { ascending: false }).limit(1).maybeSingle();
  const { attachment: _attachment, ...rest } = parsed.data;
  const { error } = await supabase.from("resources").insert({
    ...rest,
    course_id: course.id,
    module_id: kind === "module" ? id : null,
    lesson_id: kind === "lesson" ? id : null,
    project_id: kind === "project" ? id : null,
    live_session_id: kind === "session" ? id : null,
    position: (last?.position ?? 0) + 1,
  });
  if (error) return failed("The resource could not be added.");

  refresh();
  return { status: "success", message: "Resource added." };
}

export async function deleteResource(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.from("resources").delete().eq("id", parsed.data.id);
  if (error) throw new Error(`Could not delete the resource: ${error.message}`);
  refresh();
}

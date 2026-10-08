"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidState, type FormState } from "@/lib/validation";

const createSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(10).max(72),
  course_id: z.uuid(),
});
const enrolmentSchema = z.object({
  student_id: z.uuid(), course_id: z.uuid(),
  status: z.enum(["active", "paused", "completed", "withdrawn"]),
});

/** Creates a student without sending email. Account details are handed over by the instructor. */
export async function createStudent(_previous: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const input = createSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalidState(input.error);
  const db = await createClient();
  const { data: course, error: courseError } = await db.from("courses").select("id").eq("id", input.data.course_id).maybeSingle();
  if (courseError || !course) return { status: "error", message: "Choose an existing course." };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.data.email, password: input.data.password, email_confirm: true,
    user_metadata: { full_name: input.data.full_name },
  });
  if (error || !data.user) return { status: "error", message: "Account could not be created. The email may already be registered; enrol an existing student below." };
  const { error: enrolmentError } = await db.from("enrollments").insert({ user_id: data.user.id, course_id: course.id, status: "active" });
  if (enrolmentError) {
    // Keep the newly created account visible for recovery; do not delete a real user to undo
    // a partial failure. The instructor can retry enrolment using the existing-student form.
    revalidatePath("/admin", "layout");
    return { status: "error", message: "Account created, but enrolment failed. Use the existing-student form below to finish enrolment." };
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Student created and enrolled. Share the initial password privately; the student can change it in Settings." };
}

/** Only student profiles may be enrolled here; this action cannot grant a staff role. */
export async function setEnrolment(_previous: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const input = enrolmentSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalidState(input.error);
  const db = await createClient();
  const { data: student, error } = await db.from("profiles").select("id").eq("id", input.data.student_id).eq("role", "student").maybeSingle();
  if (error || !student) return { status: "error", message: "Choose an existing student." };
  const { error: saveError } = await db.from("enrollments").upsert({ user_id: student.id, course_id: input.data.course_id, status: input.data.status }, { onConflict: "user_id,course_id" });
  if (saveError) return { status: "error", message: "Enrolment could not be saved. Please try again." };
  revalidatePath("/admin", "layout");
  revalidatePath("/learn", "layout");
  return { status: "success", message: "Enrolment saved. Paused and withdrawn students cannot access course content." };
}

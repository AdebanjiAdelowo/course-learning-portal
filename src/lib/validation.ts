import { z } from "zod";

import { safeAvatarUrl } from "@/lib/domain/profile";
import { isValidTimeZone } from "@/lib/format";

/** Input schemas shared by server actions. Everything a browser sends is parsed here first. */

export const PASSWORD_MIN_LENGTH = 10;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(72, "Use at most 72 characters.");

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a full https:// link.");

const optionalHttpsUrl = z.union([z.literal(""), httpsUrl]).transform((v) => (v === "" ? null : v));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(120),
  timezone: z.string().trim().refine(isValidTimeZone, "Choose a valid time zone."),
  bio: z.string().trim().max(2000, "Keep this under 2000 characters."),
});

/** Fields shown on the public website for the instructor. Links are parsed separately. */
export const publicProfileSchema = z.object({
  headline: z.string().trim().max(160, "Keep this under 160 characters."),
  avatar_url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || safeAvatarUrl(value) !== null, "Enter an https:// link to an image, or leave this empty."),
  links_text: z.string().max(4000),
});

export const submissionSchema = z
  .object({
    project_id: z.uuid(),
    intent: z.enum(["save", "submit"]),
    work_url: optionalHttpsUrl,
    notes: z.string().trim().max(5000, "Keep notes under 5000 characters."),
  })
  .refine((data) => data.intent === "save" || data.work_url !== null, {
    path: ["work_url"],
    message: "Add a link to your work before submitting.",
  });

const answerValue = z.union([
  z.string().max(500),
  z.array(z.string().max(64)).max(26),
  z.boolean(),
  z.null(),
]);

export const quizSubmissionSchema = z.object({
  quiz_id: z.uuid(),
  answers: z.record(z.uuid(), answerValue),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email,
  topic: z.enum(["general", "enrolment", "access", "technical"]),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(5000),
});

export const searchQuerySchema = z.string().trim().min(2).max(100);

// --- Instructor / admin forms ------------------------------------------------

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
  .max(80);

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const lines = z
  .string()
  .max(4000)
  .transform((value) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

export const lessonSchema = z.object({
  module_id: z.uuid(),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  slug,
  summary: z.string().trim().max(400),
  objectives: lines,
  duration_minutes: z.coerce.number().int().min(1).max(600),
  video_url: optionalHttpsUrl,
  body_md: z.string().max(200_000),
  is_published: checkbox,
});

export const moduleSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(160),
  slug,
  description: z.string().trim().max(600),
  requires_previous: checkbox,
});

export const moduleUpdateSchema = z.object({
  module_id: z.uuid(),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  description: z.string().trim().max(600),
  // Empty means "not assigned to a phase".
  phase_id: z.union([z.literal(""), z.uuid("Choose a phase.")]).transform((v) => (v === "" ? null : v)),
  requires_previous: checkbox,
  is_published: checkbox,
});

export const reviewSchema = z
  .object({
    submission_id: z.uuid(),
    title: z.string().trim().min(1, "Enter a title.").max(160),
    body_md: z.string().trim().min(1, "Write some feedback.").max(10_000),
    score: z.union([z.literal(""), z.coerce.number().min(0).max(10_000)]),
  })
  .transform((data) => ({ ...data, score: data.score === "" ? null : data.score }));

export const generalFeedbackSchema = z.object({
  student_id: z.uuid(),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  body_md: z.string().trim().min(1, "Write some feedback.").max(10_000),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(160),
  body_md: z.string().trim().min(1, "Write the announcement.").max(10_000),
  pinned: checkbox,
});

export const liveSessionSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(160),
    description: z.string().trim().max(2000),
    instructor_name: z.string().trim().min(1, "Enter the host's name.").max(120),
    timezone: z.string().trim().refine(isValidTimeZone, "Choose a valid time zone."),
    // datetime-local values, interpreted in `timezone`.
    starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a start date and time."),
    duration_minutes: z.coerce.number().int().min(10).max(480),
    meeting_url: optionalHttpsUrl,
  });

export const quizSchema = z.object({
  module_id: z.uuid("Choose a module."),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  slug,
  description: z.string().trim().max(600),
  pass_percent: z.coerce.number().int("Use a whole number.").min(0).max(100),
  // Empty means unlimited retakes.
  max_attempts: z.union([z.literal(""), z.coerce.number().int().min(1).max(50)]).transform((v) => (v === "" ? null : v)),
  is_published: checkbox,
});

export const questionSchema = z.object({
  quiz_id: z.uuid(),
  type: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer"]),
  prompt_md: z.string().trim().min(1, "Write the question.").max(5000),
  options_text: z.string().max(8000),
  true_false: z.string().max(5),
  accepted_text: z.string().max(4000),
  explanation_md: z.string().trim().max(5000),
  points: z.coerce.number().int("Use a whole number.").min(1).max(100),
});

export const projectSchema = z.object({
  module_id: z.uuid("Choose a module."),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  slug,
  summary: z.string().trim().max(400),
  description_md: z.string().max(50_000),
  objectives: lines,
  requirements: lines,
  submission_instructions_md: z.string().trim().max(5000),
  rubric_text: z.string().max(8000),
  // datetime-local value interpreted in the instructor's time zone; empty means no deadline.
  due_at: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.")]),
  is_published: checkbox,
});

/** An https link, or a path to a file shipped in /public such as "/resources/sheet.pdf". */
const resourceUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (/^\/(?!\/)[\w\-./%]+$/.test(value)) return !value.includes("..");
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter an https:// link, or a path such as /resources/file.pdf.");

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(160),
  description: z.string().trim().max(400),
  kind: z.enum(["pdf", "notebook", "dataset", "code", "video", "slides", "reading", "link"]),
  url: resourceUrl,
  attachment: z.string().max(60),
});

export type FieldErrors = Record<string, string[] | undefined>;

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
}

export const idleState: FormState = { status: "idle" };

export function invalidState(error: z.ZodError, message = "Please check the highlighted fields."): FormState {
  return { status: "error", message, fieldErrors: z.flattenError(error).fieldErrors as FieldErrors };
}

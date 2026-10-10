/**
 * Shape of the course definition consumed by `scripts/seed.ts`.
 * The course is data: phases, modules, lessons, quizzes, projects and coding problems are defined
 * in `seed/course.ts`, lesson bodies in `seed/lessons`, and each coding problem in its own folder
 * under `seed/problems`. Everything here can also be edited in the instructor area afterwards.
 */

export type ResourceKind = "pdf" | "notebook" | "dataset" | "code" | "video" | "slides" | "reading" | "link";

export interface SeedResource {
  title: string;
  description?: string;
  kind: ResourceKind;
  /** Absolute https URL, or a path to a file in /public such as "/resources/sheet.pdf". */
  url: string;
}

export interface SeedLesson {
  slug: string;
  title: string;
  summary: string;
  durationMinutes: number;
  objectives: string[];
  /** Markdown file name inside seed/lessons, without the extension. Defaults to the slug. */
  file?: string;
  videoUrl?: string;
  resources?: SeedResource[];
}

export type SeedQuestion =
  | {
      type: "multiple_choice";
      prompt: string;
      options: string[];
      /** Zero-based index of the correct option. */
      answer: number;
      explanation: string;
      points?: number;
    }
  | {
      type: "multiple_select";
      prompt: string;
      options: string[];
      /** Zero-based indices of every correct option. */
      answers: number[];
      explanation: string;
      points?: number;
    }
  | { type: "true_false"; prompt: string; answer: boolean; explanation: string; points?: number }
  | {
      type: "short_answer";
      prompt: string;
      /** Accepted answers, compared without regard to case or surrounding whitespace. */
      accepted: string[];
      explanation: string;
      points?: number;
    };

export interface SeedQuiz {
  slug: string;
  title: string;
  description: string;
  passPercent: number;
  maxAttempts?: number;
  questions: SeedQuestion[];
}

export interface SeedProject {
  slug: string;
  title: string;
  summary: string;
  description: string;
  objectives: string[];
  requirements: string[];
  submissionInstructions: string;
  rubric: { criterion: string; description: string; points: number }[];
  /** Deadline, in days from the moment the seed script runs (negative: already past). */
  dueInDays: number;
  resources?: SeedResource[];
}

export type ProblemDifficulty = "warm_up" | "core" | "challenge";

/**
 * A coding problem. Its statement, editorial, starter code, reference solution and tests live
 * in `seed/problems/<slug>/` (problem.md, editorial.md, starter.py, solution.py, tests.json),
 * where `python3 scripts/verify_content.py` runs the reference solution against every test.
 */
export interface SeedProblem {
  slug: string;
  title: string;
  summary: string;
  difficulty: ProblemDifficulty;
  constraints: string[];
  /** Revealed one at a time, from a gentle nudge to nearly the whole idea. */
  hints: string[];
}

/**
 * A fuller description of a lesson that is not written yet: enough for an author to write it
 * without redesigning it. It stays in the seed files and is not loaded into the database.
 */
export interface SeedLessonSpec {
  durationMinutes: number;
  objectives: string[];
  /** The twelve sections every lesson follows, each with what this lesson puts there. */
  sections: { heading: string; covers: string }[];
  workedExamples: string[];
  exercises: string[];
  /** What a student must be able to do to count the lesson as understood. */
  assessment: string[];
}

export interface SeedPlannedLesson {
  title: string;
  summary: string;
  spec?: SeedLessonSpec;
}

/**
 * What a planned module will teach. Shown in the learning path under the module's title, so
 * students can see where the course is going. It describes intent and contains no content.
 */
export interface SeedModulePlan {
  objectives: string[];
  lessons: SeedPlannedLesson[];
  /** Slugs of the modules a student should finish first. */
  prerequisites: string[];
  workedExamples?: string[];
  /** Coding exercises to be written, one line each. */
  practice?: string[];
  visualizations?: string[];
}

export interface SeedModule {
  slug: string;
  title: string;
  description: string;
  /**
   * false marks a planned module: it appears in the learning path by title and description,
   * but has no content yet and students cannot open it. Defaults to true.
   */
  published?: boolean;
  /** Opens this many days from now; omit for no date gate. */
  availableInDays?: number;
  requiresPrevious?: boolean;
  lessons?: SeedLesson[];
  quiz?: SeedQuiz;
  project?: SeedProject;
  problems?: SeedProblem[];
  resources?: SeedResource[];
  plan?: SeedModulePlan;
}

/** A phase groups consecutive modules into one stage of the learning path. */
export interface SeedPhase {
  slug: string;
  title: string;
  description: string;
  modules: SeedModule[];
}

export type CohortStatus = "planned" | "open" | "waitlist" | "running" | "completed";

/**
 * One run of the course. Cohorts share all course material; they differ only in dates,
 * students, and any live sessions or announcements addressed to them.
 */
export interface SeedCohort {
  slug: string;
  name: string;
  description: string;
  status: CohortStatus;
  /** Start, in days from now. Omit when the dates are not decided. */
  startsInDays?: number;
  durationWeeks?: number;
  capacity?: number;
  /** Listed on the public website. */
  isPublic: boolean;
}

export interface SeedLiveSession {
  title: string;
  description: string;
  /** Start, in days from now (fractions allowed; negative: in the past). */
  startsInDays: number;
  /** Local start time in `timezone`, "HH:MM". */
  startTime: string;
  durationMinutes: number;
  timezone: string;
  moduleSlug?: string;
  /** Limits the session to one cohort. Omit for everyone on the course. */
  cohortSlug?: string;
  meetingUrl?: string;
  recordingUrl?: string;
  slidesUrl?: string;
  notes?: string;
  resources?: SeedResource[];
}

export interface SeedAnnouncement {
  title: string;
  body: string;
  pinned?: boolean;
  publishedDaysAgo: number;
}

export interface SeedInstructor {
  email: string;
  fullName: string;
  timezone: string;
  /** One line under the name on the public site, for example a role. Optional. */
  headline?: string;
  /** Leave empty rather than inventing one; it can be written later in Settings. */
  bio?: string;
  /** https URL, or a path to an image in /public. */
  avatarUrl?: string;
  links?: { label: string; url: string }[];
}

export interface SeedCourse {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  durationWeeks?: number;
  outcomes: string[];
  prerequisites: string[];
  instructor: SeedInstructor;
  phases: SeedPhase[];
  cohorts: SeedCohort[];
  liveSessions: SeedLiveSession[];
  announcements: SeedAnnouncement[];
  resources?: SeedResource[];
}

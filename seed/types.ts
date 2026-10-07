/**
 * Shape of the course definition consumed by `scripts/seed.ts`.
 * To publish your own course, replace `seed/course.ts` and the Markdown files in `seed/lessons`.
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

export interface SeedModule {
  slug: string;
  title: string;
  description: string;
  /** Opens this many days from now; omit for no date gate. */
  availableInDays?: number;
  requiresPrevious?: boolean;
  lessons: SeedLesson[];
  quiz?: SeedQuiz;
  project?: SeedProject;
  resources?: SeedResource[];
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

export interface SeedCourse {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  durationWeeks: number;
  outcomes: string[];
  prerequisites: string[];
  instructor: { email: string; fullName: string; bio: string; timezone: string };
  modules: SeedModule[];
  liveSessions: SeedLiveSession[];
  announcements: SeedAnnouncement[];
  resources?: SeedResource[];
}

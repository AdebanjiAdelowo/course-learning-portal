/**
 * Progress and unlocking rules. Pure functions: no database, no clock (the caller passes `now`),
 * so the rules are easy to read and to test.
 *
 * COMPLETION FORMULA
 * ------------------
 * A course is made of required items: every published lesson, quiz and project.
 * Each item counts once, with equal weight, and is "done" when:
 *
 *   lesson   the student marked it complete
 *   quiz     the student's best attempt reached the quiz's pass mark
 *   project  the student's work is submitted or reviewed (a draft does not count)
 *
 *   completion % = floor(100 * done items / required items)
 *
 * Rounding down means 100% is shown only when every item really is done. A course with no
 * items reports 0%. Module completion uses the same formula restricted to that module.
 *
 * UNLOCKING
 * ---------
 * A module is locked when its `availableFrom` date is still in the future, or when it
 * `requiresPrevious` and the previous module still has incomplete lessons. Quizzes and
 * projects never block the next module, so a late project cannot strand a student.
 */

export type SubmissionStatus = "in_progress" | "submitted" | "reviewed";
export type ProjectStatus = "not_started" | SubmissionStatus;

export interface OutlineLesson {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  position: number;
}

export interface OutlineQuiz {
  id: string;
  slug: string;
  title: string;
  passPercent: number;
}

export interface OutlineProject {
  id: string;
  slug: string;
  title: string;
  dueAt: string | null;
}

export interface OutlineModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  position: number;
  availableFrom: string | null;
  requiresPrevious: boolean;
  lessons: OutlineLesson[];
  quizzes: OutlineQuiz[];
  projects: OutlineProject[];
}

export interface QuizStanding {
  attempts: number;
  bestPercent: number;
  passed: boolean;
}

export interface StudentRecord {
  completedLessonIds: ReadonlySet<string>;
  quizStandings: ReadonlyMap<string, QuizStanding>;
  projectStatuses: ReadonlyMap<string, SubmissionStatus>;
}

export type ModuleState = "locked" | "available" | "in_progress" | "completed";

export interface ModuleProgress {
  module: OutlineModule;
  state: ModuleState;
  /** Human-readable reason, set only when the module is locked. */
  lockReason: string | null;
  percent: number;
  doneItems: number;
  totalItems: number;
  lessonsDone: number;
  durationMinutes: number;
}

export interface NextStep {
  kind: "lesson" | "quiz" | "project";
  title: string;
  href: string;
  moduleTitle: string;
  modulePosition: number;
  durationMinutes: number | null;
}

export interface CourseProgress {
  percent: number;
  doneItems: number;
  totalItems: number;
  lessons: { done: number; total: number };
  quizzes: { passed: number; attempted: number; total: number; averageBestPercent: number | null };
  projects: { submitted: number; total: number };
  modules: { done: number; total: number };
  moduleProgress: ModuleProgress[];
  /** The module the student should be working in: the first unlocked one that is not finished. */
  currentModule: ModuleProgress | null;
  /** The single most useful thing to do next, or null when the course is finished. */
  nextStep: NextStep | null;
}

export function percentOf(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((100 * Math.min(done, total)) / total);
}

export function isProjectDone(status: ProjectStatus | undefined): boolean {
  return status === "submitted" || status === "reviewed";
}

export function emptyRecord(): StudentRecord {
  return { completedLessonIds: new Set(), quizStandings: new Map(), projectStatuses: new Map() };
}

function countModule(module: OutlineModule, record: StudentRecord) {
  const lessonsDone = module.lessons.filter((l) => record.completedLessonIds.has(l.id)).length;
  const quizzesPassed = module.quizzes.filter((q) => record.quizStandings.get(q.id)?.passed).length;
  const projectsDone = module.projects.filter((p) =>
    isProjectDone(record.projectStatuses.get(p.id)),
  ).length;
  const touched =
    lessonsDone > 0 ||
    module.quizzes.some((q) => record.quizStandings.has(q.id)) ||
    module.projects.some((p) => record.projectStatuses.has(p.id));
  return {
    lessonsDone,
    quizzesPassed,
    projectsDone,
    touched,
    doneItems: lessonsDone + quizzesPassed + projectsDone,
    totalItems: module.lessons.length + module.quizzes.length + module.projects.length,
  };
}

export interface ProgressOptions {
  now?: Date;
  /** Staff preview the course with nothing locked. */
  ignoreLocks?: boolean;
}

export function computeCourseProgress(
  modules: readonly OutlineModule[],
  record: StudentRecord,
  options: ProgressOptions = {},
): CourseProgress {
  const now = options.now ?? new Date();
  const ordered = [...modules].sort((a, b) => a.position - b.position);

  const moduleProgress: ModuleProgress[] = [];
  let previousLessonsComplete = true;
  let previousTitle = "";

  for (const mod of ordered) {
    const counts = countModule(mod, record);
    let lockReason: string | null = null;

    if (!options.ignoreLocks) {
      if (mod.availableFrom && new Date(mod.availableFrom).getTime() > now.getTime()) {
        lockReason = "Opens on a later date";
      } else if (mod.requiresPrevious && !previousLessonsComplete) {
        lockReason = `Complete the lessons in "${previousTitle}" first`;
      }
    }

    const complete = counts.totalItems > 0 && counts.doneItems === counts.totalItems;
    const state: ModuleState = lockReason
      ? "locked"
      : complete
        ? "completed"
        : counts.touched
          ? "in_progress"
          : "available";

    moduleProgress.push({
      module: mod,
      state,
      lockReason,
      percent: percentOf(counts.doneItems, counts.totalItems),
      doneItems: counts.doneItems,
      totalItems: counts.totalItems,
      lessonsDone: counts.lessonsDone,
      durationMinutes: mod.lessons.reduce((sum, l) => sum + l.durationMinutes, 0),
    });

    previousLessonsComplete = counts.lessonsDone === mod.lessons.length;
    previousTitle = mod.title;
  }

  const allLessons = ordered.flatMap((m) => m.lessons);
  const allQuizzes = ordered.flatMap((m) => m.quizzes);
  const allProjects = ordered.flatMap((m) => m.projects);

  const lessonsDone = allLessons.filter((l) => record.completedLessonIds.has(l.id)).length;
  const standings = allQuizzes.flatMap((q) => {
    const standing = record.quizStandings.get(q.id);
    return standing ? [standing] : [];
  });
  const quizzesPassed = standings.filter((s) => s.passed).length;
  const projectsSubmitted = allProjects.filter((p) =>
    isProjectDone(record.projectStatuses.get(p.id)),
  ).length;

  const doneItems = lessonsDone + quizzesPassed + projectsSubmitted;
  const totalItems = allLessons.length + allQuizzes.length + allProjects.length;

  const unlocked = moduleProgress.filter((m) => m.state !== "locked");
  const currentModule = unlocked.find((m) => m.state !== "completed") ?? null;

  return {
    percent: percentOf(doneItems, totalItems),
    doneItems,
    totalItems,
    lessons: { done: lessonsDone, total: allLessons.length },
    quizzes: {
      passed: quizzesPassed,
      attempted: standings.length,
      total: allQuizzes.length,
      averageBestPercent: standings.length
        ? Math.round(standings.reduce((sum, s) => sum + s.bestPercent, 0) / standings.length)
        : null,
    },
    projects: { submitted: projectsSubmitted, total: allProjects.length },
    modules: {
      done: moduleProgress.filter((m) => m.state === "completed").length,
      total: moduleProgress.length,
    },
    moduleProgress,
    currentModule,
    nextStep: findNextStep(unlocked, record),
  };
}

/**
 * Lessons come first, in order, across every unlocked module; then the earliest unpassed quiz;
 * then the earliest project that has not been submitted.
 */
function findNextStep(unlocked: readonly ModuleProgress[], record: StudentRecord): NextStep | null {
  for (const { module: mod } of unlocked) {
    const lesson = [...mod.lessons]
      .sort((a, b) => a.position - b.position)
      .find((l) => !record.completedLessonIds.has(l.id));
    if (lesson) {
      return {
        kind: "lesson",
        title: lesson.title,
        href: `/learn/lessons/${lesson.slug}`,
        moduleTitle: mod.title,
        modulePosition: mod.position,
        durationMinutes: lesson.durationMinutes,
      };
    }
  }
  for (const { module: mod } of unlocked) {
    const quiz = mod.quizzes.find((q) => !record.quizStandings.get(q.id)?.passed);
    if (quiz) {
      return {
        kind: "quiz",
        title: quiz.title,
        href: `/learn/quizzes/${quiz.slug}`,
        moduleTitle: mod.title,
        modulePosition: mod.position,
        durationMinutes: null,
      };
    }
  }
  for (const { module: mod } of unlocked) {
    const project = mod.projects.find((p) => !isProjectDone(record.projectStatuses.get(p.id)));
    if (project) {
      return {
        kind: "project",
        title: project.title,
        href: `/learn/projects/${project.slug}`,
        moduleTitle: mod.title,
        modulePosition: mod.position,
        durationMinutes: null,
      };
    }
  }
  return null;
}

/** Previous and next lesson in course order, skipping lessons inside locked modules. */
export function lessonNeighbours(
  moduleProgress: readonly ModuleProgress[],
  lessonId: string,
): { previous: OutlineLesson | null; next: OutlineLesson | null } {
  const sequence = moduleProgress
    .filter((m) => m.state !== "locked")
    .flatMap((m) => [...m.module.lessons].sort((a, b) => a.position - b.position));
  const index = sequence.findIndex((l) => l.id === lessonId);
  if (index === -1) return { previous: null, next: null };
  return { previous: sequence[index - 1] ?? null, next: sequence[index + 1] ?? null };
}

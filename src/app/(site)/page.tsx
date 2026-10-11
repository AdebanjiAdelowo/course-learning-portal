import { ArrowRight, BookOpenText, CalendarClock, ClipboardCheck, Code2, FlaskConical, MessageSquareText, PlayCircle } from "lucide-react";
import type { Metadata } from "next";

import { PhaseSection, PlannedModule } from "@/components/learning-path";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPublicOutline } from "@/lib/data/public";
import { buildLearningPath, parseModulePlan, pathSummary } from "@/lib/domain/path";
import { formatDuration, initials } from "@/lib/format";

// The outline comes from the database, so render on request rather than at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const outline = await getPublicOutline();
  const title = outline ? `${outline.title} · ${siteConfig.name}` : siteConfig.name;
  const description = outline?.subtitle ?? siteConfig.description;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, siteName: siteConfig.name, type: "website" },
  };
}

const features = [
  { icon: BookOpenText, title: "Rigorous lessons", text: "Every topic goes from intuition to a precise statement, a proof of correctness and a cost analysis, with tested Python." },
  { icon: PlayCircle, title: "Step-through visualizations", text: "Run an algorithm on your own input, one step at a time, beside its pseudocode, variables and operation counts." },
  { icon: Code2, title: "Coding practice", text: "Problems from warm-up to challenge. Run your Python against sample tests in the browser, reveal hints one at a time, and read a written editorial." },
  { icon: ClipboardCheck, title: "Quizzes", text: "A check at the end of each module, with an explanation for every answer and unlimited retakes." },
  { icon: FlaskConical, title: "Reviewed projects", text: "One project per module, reviewed against a published rubric with written feedback." },
  { icon: CalendarClock, title: "Live sessions", text: "Workshops and office hours. Recordings and notes stay in the portal." },
  { icon: MessageSquareText, title: "Personal feedback", text: "Comments on your work and progress from the instructor, collected in one place." },
];

const faqs = [
  {
    q: "How do I get access to the learning portal?",
    a: "Accounts are created for enrolled students by the course team, who send you your sign-in details. There is no public sign-up.",
  },
  {
    q: "I have forgotten my password. What should I do?",
    a: "Use the “Forgot your password?” link on the login page. We will email you a link that lets you choose a new one. The link is valid for one hour.",
  },
  {
    q: "Do I need to know Python already?",
    a: "The course is taught in Python and begins with a Python foundations phase. Modules marked as planned in the curriculum are not published yet, so check there for what is available today.",
  },
  {
    q: "Can I run my code, and is it graded?",
    a: "You can run Python in your browser: in the playground, in runnable examples inside lessons, and against the sample tests of each practice problem. Those results are local feedback on your own device, not a grade. Submitting a solution saves it and unlocks a written editorial for self-review.",
  },
  {
    q: "Do I have to follow the course at fixed times?",
    a: "No. Lessons, quizzes, practice problems and projects are self-paced within each module. Live sessions are scheduled, and their notes are posted afterwards.",
  },
  {
    q: "How is my progress calculated?",
    a: "Every lesson, quiz and project counts once. A lesson counts when you mark it complete, a quiz when you pass it, and a project when you submit it. Practice problems are tracked separately and do not change the percentage.",
  },
  {
    q: "What do I need to take part?",
    a: "A computer with Python 3.10 or newer and a text editor. Nothing else needs to be installed: the course uses only the Python standard library.",
  },
];

export default async function HomePage() {
  const outline = await getPublicOutline();
  // Planned modules carry no lessons, so every count below describes published material only.
  const published = outline?.modules.filter((m) => m.is_published) ?? [];
  const lessonCount = published.reduce((sum, m) => sum + m.lessons.length, 0);
  const problemCount = published.reduce((sum, m) => sum + m.problem_count, 0);
  const path = buildLearningPath(
    (outline?.phases ?? []).map((phase) => ({ ...phase, isPreparatory: phase.is_preparatory })),
    (outline?.modules ?? []).map((m) => ({
      slug: m.slug,
      title: m.title,
      description: m.description,
      position: m.position,
      phaseId: m.phase_id,
      isPublished: m.is_published,
      plan: parseModulePlan(m.plan),
    })),
  );
  const publishedBySlug = new Map(published.map((m) => [m.slug, m]));
  const phaseCount = path.phases.filter((phase) => phase.number > 0).length;
  const firstOpenPhase = path.phases.find((phase) => phase.available > 0) ?? path.phases[0];

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <p className="eyebrow text-accent">
              {siteConfig.tagline}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
              {outline?.title ?? siteConfig.name}
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-relaxed text-ink-soft">{outline?.subtitle ?? siteConfig.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/learn/login" size="lg">
                Enter the learning portal
                <ArrowRight className="size-5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/#curriculum" variant="secondary" size="lg">
                See the curriculum
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              Not enrolled yet?{" "}
              <a href="/contact" className="font-semibold text-ink-soft underline underline-offset-4">
                Ask about the next cohort
              </a>
            </p>
          </div>

          {outline ? (
            <dl className="card grid grid-cols-2 divide-x divide-y divide-line overflow-hidden">
              {[
                [String(phaseCount), phaseCount === 1 ? "phase in the learning path" : "phases in the learning path"],
                [`${path.available} of ${path.total}`, "modules available now"],
                [String(lessonCount), lessonCount === 1 ? "lesson published" : "lessons published"],
                [String(problemCount), problemCount === 1 ? "practice problem" : "practice problems"],
              ].map(([value, label], index) => (
                <div key={label} className={`p-6 sm:p-8 ${index < 2 ? "border-t-0" : ""} ${index % 2 === 0 ? "border-l-0" : ""}`}>
                  <dd className="font-serif text-4xl font-semibold tabular-nums">{value}</dd>
                  <dt className="mt-1 text-ink-soft">{label}</dt>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <section id="overview" aria-labelledby="overview-title" className="scroll-mt-28 border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <p className="eyebrow">Course overview</p>
              <h2 id="overview-title" className="mt-3 text-3xl font-semibold sm:text-4xl">What you will learn</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                {outline?.description ?? "The course outline will be published here soon."}
              </p>
              {outline && outline.prerequisites.length > 0 ? (
                <div className="mt-8">
                  <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Prerequisites</h3>
                  <ul className="mt-3 space-y-2 text-ink-soft">
                    {outline.prerequisites.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {outline && outline.outcomes.length > 0 ? (
              <ol className="space-y-px overflow-hidden rounded-xl border border-line bg-line">
                {outline.outcomes.map((outcome, index) => (
                  <li key={outcome} className="flex gap-5 bg-surface p-5 sm:p-6">
                    <span className="font-mono text-sm text-accent" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-lg leading-snug">{outcome}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <ul className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon className="size-6 text-accent" aria-hidden="true" />
                <h3 className="mt-3 font-sans text-base font-bold">{title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-28 border-b border-line bg-sunken/50">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <p className="eyebrow">Curriculum</p>
          <h2 id="curriculum-title" className="mt-3 text-3xl font-semibold sm:text-4xl">The learning path</h2>
          {path.total > 0 ? (
            <>
              <p className="mt-4 max-w-2xl text-lg text-ink-soft">
                {phaseCount} {phaseCount === 1 ? "phase" : "phases"} · {pathSummary(path)}. Planned modules are listed so you can
                see where the course is going; they open as they are written.
              </p>
              <div className="mt-8 space-y-4">
                {path.phases.map((phase) => (
                  <PhaseSection key={phase.id ?? "other"} phase={phase} defaultOpen={phase === firstOpenPhase} headingLevel={3}>
                    <ol className="grid gap-4 md:grid-cols-2">
                      {phase.modules.map((mod) => {
                        const live = publishedBySlug.get(mod.slug);
                        if (!live) {
                          return (
                            <li key={mod.slug}>
                              <PlannedModule module={mod} />
                            </li>
                          );
                        }
                        return (
                          <li key={mod.slug} className="card p-6 sm:p-7 md:col-span-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="eyebrow">{mod.label.text}</p>
                              <Badge tone="accent">Available</Badge>
                            </div>
                            <h3 className="mt-2 text-2xl font-semibold">{mod.title}</h3>
                            <p className="mt-2 max-w-3xl text-ink-soft">{mod.description}</p>
                            <ol className="mt-5 grid gap-x-10 gap-y-2 border-t border-line pt-4 md:grid-cols-2">
                              {live.lessons.map((lesson, index) => (
                                <li key={lesson.title} className="flex items-baseline justify-between gap-4 text-[0.97rem]">
                                  <span>
                                    <span className="mr-2.5 font-mono text-xs text-ink-faint">{index + 1}</span>
                                    {lesson.title}
                                  </span>
                                  <span className="shrink-0 text-sm text-ink-faint">{formatDuration(lesson.duration_minutes)}</span>
                                </li>
                              ))}
                            </ol>
                            <p className="mt-4 text-sm text-ink-faint">
                              {[
                                live.quiz_count > 0 ? "Quiz" : null,
                                live.problem_count > 0
                                  ? `${live.problem_count} practice ${live.problem_count === 1 ? "problem" : "problems"}`
                                  : null,
                                live.projects.length > 0 ? `Project: ${live.projects.join(", ")}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </PhaseSection>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 text-lg text-ink-soft">The curriculum is being finalised and will appear here shortly.</p>
          )}
        </div>
      </section>

      {outline?.instructor ? (
        <section id="instructor" aria-labelledby="instructor-title" className="scroll-mt-28 border-b border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            {outline.instructor.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- an instructor-supplied URL of unknown size
              <img
                src={outline.instructor.avatar_url}
                alt=""
                width={112}
                height={112}
                className="size-28 rounded-full border border-line-strong object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-full border border-line-strong bg-accent-soft font-serif text-4xl font-semibold text-accent-strong" aria-hidden="true">
                {initials(outline.instructor.full_name)}
              </div>
            )}
            <div className="max-w-2xl">
              <p className="eyebrow">Your instructor</p>
              <h2 id="instructor-title" className="mt-3 text-3xl font-semibold sm:text-4xl">{outline.instructor.full_name}</h2>
              {outline.instructor.headline ? <p className="mt-2 text-lg font-medium">{outline.instructor.headline}</p> : null}
              {outline.instructor.bio ? <p className="mt-4 text-lg leading-relaxed text-ink-soft">{outline.instructor.bio}</p> : null}
              {outline.instructor.links.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                  {outline.instructor.links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4">
                        {link.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28 border-b border-line">
        <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
          <p className="eyebrow">Questions</p>
          <h2 id="faq-title" className="mt-3 text-3xl font-semibold sm:text-4xl">Frequently asked</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-2xl font-normal text-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-10 leading-relaxed text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="help-title">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:py-20">
          <h2 id="help-title" className="text-3xl font-semibold">Need help, or want to join the next cohort?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">
            Write to the course team about enrolment, access problems or anything else.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" size="lg">Contact the course team</ButtonLink>
            <ButtonLink href="/learn/login" variant="secondary" size="lg">Student login</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

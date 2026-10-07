import { ArrowRight, BookOpenText, CalendarClock, ClipboardCheck, FlaskConical, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPublicOutline } from "@/lib/data/public";
import { formatDuration, initials } from "@/lib/format";

// The outline comes from the database, so render on request rather than at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const outline = await getPublicOutline();
  return outline
    ? { title: { absolute: `${outline.title} · ${siteConfig.name}` }, description: outline.description }
    : {};
}

const features = [
  { icon: BookOpenText, title: "Structured lessons", text: "Written lessons with worked mathematics, runnable code and exercises, released module by module." },
  { icon: FlaskConical, title: "Reviewed projects", text: "One project per module, graded against a published rubric with written feedback." },
  { icon: ClipboardCheck, title: "Short quizzes", text: "A check at the end of each module, with an explanation for every answer and unlimited retakes." },
  { icon: CalendarClock, title: "Live sessions", text: "Regular seminars and office hours. Recordings, slides and notes stay in the portal." },
  { icon: MessageSquareText, title: "Personal feedback", text: "Comments on your work and progress from the instructor, collected in one place." },
];

const faqs = [
  {
    q: "How do I get access to the learning portal?",
    a: "Accounts are created for enrolled students by the course team. You will receive an email inviting you to set a password. There is no public sign-up.",
  },
  {
    q: "I have forgotten my password. What should I do?",
    a: "Use the “Forgot your password?” link on the login page. We will email you a link that lets you choose a new one. The link is valid for one hour.",
  },
  {
    q: "Do I have to follow the course at fixed times?",
    a: "No. Lessons, quizzes and projects are self-paced within each module. Live sessions are scheduled, but every session is recorded and posted with its notes.",
  },
  {
    q: "How is my progress calculated?",
    a: "Every lesson, quiz and project counts once. A lesson counts when you mark it complete, a quiz when you pass it, and a project when you submit it. The percentage on your dashboard is simply the share of those items you have finished.",
  },
  {
    q: "What do I need to take part?",
    a: "A laptop with Python 3.10 or newer. A GPU is helpful for the final module but not required: the projects are sized to run on a free cloud notebook.",
  },
  {
    q: "What happens if I miss a project deadline?",
    a: "Late work is still reviewed. Deadlines exist to keep the cohort together, so tell the course team in advance if you need more time.",
  },
];

export default async function HomePage() {
  const outline = await getPublicOutline();
  const lessonCount = outline?.modules.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;
  const minutes = outline?.modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + l.duration_minutes, 0), 0) ?? 0;
  const projectCount = outline?.modules.reduce((sum, m) => sum + m.projects.length, 0) ?? 0;

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <p className="eyebrow text-accent">
              {outline ? [outline.level, outline.duration_weeks ? `${outline.duration_weeks} weeks` : null, "Cohort-based"].filter(Boolean).join(" · ") : siteConfig.tagline}
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
                [String(outline.modules.length), "modules"],
                [String(lessonCount), "lessons"],
                [String(projectCount), "reviewed projects"],
                [formatDuration(minutes), "of guided reading"],
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

          <ul className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
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
          <p className="eyebrow">Curriculum preview</p>
          <h2 id="curriculum-title" className="mt-3 text-3xl font-semibold sm:text-4xl">Module by module</h2>
          {outline && outline.modules.length > 0 ? (
            <ol className="mt-10 grid gap-5 md:grid-cols-2">
              {outline.modules.map((mod) => (
                <li key={mod.position} className="card p-6 sm:p-7">
                  <p className="eyebrow">Module {mod.position}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{mod.title}</h3>
                  <p className="mt-2 text-ink-soft">{mod.description}</p>
                  <ol className="mt-5 space-y-2 border-t border-line pt-4">
                    {mod.lessons.map((lesson, index) => (
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
                    {mod.quiz_count > 0 ? "Quiz" : "No quiz"}
                    {mod.projects.length > 0 ? ` · Project: ${mod.projects.join(", ")}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-lg text-ink-soft">The curriculum is being finalised and will appear here shortly.</p>
          )}
        </div>
      </section>

      {outline?.instructor ? (
        <section id="instructor" aria-labelledby="instructor-title" className="scroll-mt-28 border-b border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
            <div className="flex size-28 items-center justify-center rounded-full border border-line-strong bg-accent-soft font-serif text-4xl font-semibold text-accent-strong" aria-hidden="true">
              {initials(outline.instructor.full_name)}
            </div>
            <div className="max-w-2xl">
              <p className="eyebrow">Your instructor</p>
              <h2 id="instructor-title" className="mt-3 text-3xl font-semibold sm:text-4xl">{outline.instructor.full_name}</h2>
              {outline.instructor.bio ? <p className="mt-4 text-lg leading-relaxed text-ink-soft">{outline.instructor.bio}</p> : null}
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

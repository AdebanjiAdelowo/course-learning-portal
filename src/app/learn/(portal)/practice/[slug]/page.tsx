import { ArrowLeft, ArrowRight, BookOpenCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { DifficultyBadge, PracticeStatusBadge } from "@/components/practice-status";
import { HintList, PracticeWorkspace, type AttemptView } from "@/components/practice-workspace";
import { ButtonLink } from "@/components/ui/button";
import { requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";
import { EDITORIAL_NOTICE, practiceStanding } from "@/lib/domain/practice";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { problems } = await requireCourseState();
  return { title: problems.find((p) => p.slug === slug)?.title ?? "Practice problem" };
}

interface Example {
  input: string;
  output: string;
  explanation: string;
  /** Present when the example can be run as a sample test in the browser. */
  test: { functionName: string; args: unknown[]; expected: unknown } | null;
}

/** Examples are stored as JSON; anything that is not a well-formed example is skipped. */
function readExamples(value: unknown): Example[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Example[] => {
    if (!item || typeof item !== "object") return [];
    const { input, output, explanation, function: functionName, args, expected } = item as Record<string, unknown>;
    if (typeof input !== "string" || typeof output !== "string") return [];
    const runnable = typeof functionName === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(functionName) && Array.isArray(args) && expected !== undefined;
    return [
      {
        input,
        output,
        explanation: typeof explanation === "string" ? explanation : "",
        test: runnable ? { functionName, args, expected } : null,
      },
    ];
  });
}

export default async function ProblemPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const { problems, progress } = await requireCourseState();

  const index = problems.findIndex((p) => p.slug === slug);
  const meta = problems[index];
  const owner = meta && progress.moduleProgress.find((m) => m.module.id === meta.module_id);
  if (!meta || !owner) notFound();

  const back = (
    <Link href="/learn/practice" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
      <ArrowLeft className="size-4" aria-hidden="true" />
      All practice problems
    </Link>
  );

  if (owner.state === "locked") {
    return (
      <div className="space-y-8">
        {back}
        <div className="card mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sunken text-ink-faint">
            <Lock className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">{meta.title}</h1>
          <p className="mt-2 text-ink-soft">
            This problem belongs to {owner.module.label}, which is still locked. {owner.lockReason}.
          </p>
          {progress.nextStep ? (
            <ButtonLink href={progress.nextStep.href} className="mt-6">
              Continue with {progress.nextStep.title}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: problem, error }, { data: rows, error: rowsError }] = await Promise.all([
    supabase
      .from("coding_problems")
      .select("id, title, summary, difficulty, statement_md, constraints, examples, starter_code, hints")
      .eq("id", meta.id)
      .maybeSingle(),
    // Staff can read every student's rows, so always scope to the viewer explicitly.
    supabase
      .from("code_submissions")
      .select("id, code, status, verdict, created_at, updated_at")
      .eq("problem_id", meta.id)
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  if (error) throw new Error(`Could not load this problem: ${error.message}`);
  if (rowsError) throw new Error(`Could not load your attempts: ${rowsError.message}`);
  if (!problem) notFound();

  const zone = viewer.profile.timezone;
  const draft = rows.find((row) => row.status === "draft");
  const submitted = rows.filter((row) => row.status === "submitted");
  const standing = practiceStanding(rows);
  const attempts: AttemptView[] = submitted.map((row, position) => ({
    id: row.id,
    number: submitted.length - position,
    code: row.code,
    submittedLabel: formatDateTime(row.created_at, zone),
  }));

  // The database releases the editorial only to staff and to students who have submitted an
  // attempt; for anyone else this call returns no rows.
  const editorialOpen = viewer.isStaff || submitted.length > 0;
  const { data: editorialRows } = editorialOpen
    ? await supabase.rpc("problem_editorial", { p_problem_id: problem.id })
    : { data: null };
  const editorial = editorialRows?.[0] ?? null;

  const examples = readExamples(problem.examples);
  // Only the visible sample tests are sent to the browser. Hidden tests and the reference
  // solution live in a table students cannot read, and are never part of this page.
  const runnable = examples.flatMap((example) => (example.test ? [example.test] : []));
  const functionName = runnable.length > 0 && runnable.every((test) => test.functionName === runnable[0]!.functionName) ? runnable[0]!.functionName : null;
  const sampleTests = functionName ? runnable.map(({ args, expected }) => ({ args, expected })) : [];
  const previous = problems[index - 1];
  const next = problems[index + 1];
  const unlocked = (moduleId: string) => progress.moduleProgress.find((m) => m.module.id === moduleId)?.state !== "locked";

  return (
    <div className="space-y-8">
      <header className="border-b border-line pb-7">
        {back}
        <p className="eyebrow mt-5">
          <Link href={`/learn/modules/${owner.module.slug}`} className="hover:text-accent">
            {owner.module.label} · {owner.module.title}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{problem.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">{problem.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          <PracticeStatusBadge status={standing.status} />
          {standing.attempts > 0 ? (
            <span className="text-sm text-ink-faint">
              {standing.attempts} {standing.attempts === 1 ? "attempt" : "attempts"} recorded
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-9">
          <section aria-labelledby="statement">
            <h2 id="statement" className="text-xl font-semibold">
              Problem
            </h2>
            <Markdown className="mt-3">{problem.statement_md}</Markdown>
          </section>

          {problem.constraints.length > 0 ? (
            <section aria-labelledby="constraints">
              <h2 id="constraints" className="text-xl font-semibold">
                Constraints
              </h2>
              <ul className="mt-3 space-y-1.5">
                {problem.constraints.map((constraint) => (
                  <li key={constraint} className="flex gap-3">
                    <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
                    <span className="font-mono text-[0.9rem]">{constraint}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {examples.length > 0 ? (
            <section aria-labelledby="examples">
              <h2 id="examples" className="text-xl font-semibold">
                Examples
              </h2>
              <p className="mt-1 text-sm text-ink-faint">Each example is a call to your function and the value it must return.</p>
              <ol className="mt-3 space-y-3">
                {examples.map((example, position) => (
                  <li key={position} className="overflow-hidden rounded-lg border border-line bg-surface">
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 p-4 text-[0.9rem]">
                      <dt className="text-ink-faint">Call</dt>
                      <dd className="overflow-x-auto font-mono whitespace-pre">{example.input}</dd>
                      <dt className="text-ink-faint">Returns</dt>
                      <dd className="overflow-x-auto font-mono font-semibold whitespace-pre">{example.output}</dd>
                    </dl>
                    {example.explanation ? (
                      <p className="border-t border-line bg-paper px-4 py-2.5 text-sm text-ink-soft">{example.explanation}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {problem.hints.length > 0 ? (
            <section aria-labelledby="hints">
              <h2 id="hints" className="text-xl font-semibold">
                Hints
              </h2>
              <div className="mt-3">
                <HintList hints={problem.hints} />
              </div>
            </section>
          ) : null}

          <section aria-labelledby="editorial">
            <h2 id="editorial" className="flex items-center gap-2 text-xl font-semibold">
              <BookOpenCheck className="size-5 text-accent" aria-hidden="true" />
              Editorial
            </h2>
            {editorial ? (
              <details className="mt-3 rounded-xl border border-line bg-surface">
                <summary className="cursor-pointer px-4 py-3 font-semibold">
                  Read the editorial and the reference solution
                </summary>
                <div className="space-y-6 border-t border-line p-4 sm:p-5">
                  <p className="text-sm text-ink-faint">
                    {viewer.isStaff && submitted.length === 0
                      ? "Shown to you as staff. Students see this after submitting an attempt."
                      : `Unlocked because you have submitted an attempt. ${EDITORIAL_NOTICE} Compare the argument here with your own before reading the code.`}
                  </p>
                  <Markdown>{editorial.editorial_md}</Markdown>
                  {editorial.reference_solution ? (
                    <div>
                      <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-ink-soft">Reference solution</h3>
                      <Markdown className="mt-2">{`\`\`\`python\n${editorial.reference_solution}\n\`\`\``}</Markdown>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : (
              <p className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3 text-ink-soft">
                <Lock className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <span>
                  {EDITORIAL_NOTICE} Run the sample tests first and make a real attempt: it is worth more than the answer.
                </span>
              </p>
            )}
          </section>
        </div>

        <div className="min-w-0">
          <PracticeWorkspace
            key={problem.id}
            problemId={problem.id}
            initialCode={draft?.code ?? submitted[0]?.code ?? problem.starter_code}
            starterCode={problem.starter_code}
            draftLabel={draft ? `Draft saved ${formatDateTime(draft.updated_at, zone)}` : null}
            attempts={attempts}
            functionName={functionName}
            sampleTests={sampleTests}
          />
        </div>
      </div>

      <nav aria-label="Practice problems" className="no-print grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
        {previous && unlocked(previous.module_id) ? (
          <Link href={`/learn/practice/${previous.slug}`} className="card group p-4 transition-colors hover:border-line-strong">
            <span className="eyebrow flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Previous problem
            </span>
            <span className="mt-1 block font-semibold group-hover:text-accent">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && unlocked(next.module_id) ? (
          <Link href={`/learn/practice/${next.slug}`} className="card group p-4 text-right transition-colors hover:border-line-strong">
            <span className="eyebrow flex items-center justify-end gap-1.5">
              Next problem
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
            <span className="mt-1 block font-semibold group-hover:text-accent">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

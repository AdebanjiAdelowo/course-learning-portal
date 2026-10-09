import type { Metadata } from "next";

import { requireStaff } from "@/lib/data/viewer";

import { QuizForm } from "../../authoring-forms";
import { EditorShell, getModuleOptions } from "../../editor-shell";

export const metadata: Metadata = { title: "New quiz" };

export default async function NewQuizPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module: moduleId } = await searchParams;
  await requireStaff();
  const modules = await getModuleOptions();
  return (
    <EditorShell eyebrow="Quiz" heading="New quiz">
      <section aria-label="Quiz settings" className="card p-6 sm:p-7">
        <QuizForm
          modules={modules}
          values={{
            module_id: modules.find((mod) => mod.id === moduleId)?.id ?? modules[0]?.id ?? "",
            title: "",
            slug: "",
            description: "",
            pass_percent: 70,
            max_attempts: null,
            is_published: false,
          }}
        />
      </section>
    </EditorShell>
  );
}

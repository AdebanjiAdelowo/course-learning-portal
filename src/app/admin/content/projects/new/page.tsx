import type { Metadata } from "next";

import { requireStaff } from "@/lib/data/viewer";
import { zoneLabel } from "@/lib/format";

import { ProjectForm } from "../../authoring-forms";
import { EditorShell, getModuleOptions } from "../../editor-shell";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module: moduleId } = await searchParams;
  const viewer = await requireStaff();
  const modules = await getModuleOptions();
  return (
    <EditorShell eyebrow="Project" heading="New project">
      <ProjectForm
        modules={modules}
        zoneLabel={zoneLabel(new Date().toISOString(), viewer.profile.timezone)}
        values={{
          module_id: modules.find((mod) => mod.id === moduleId)?.id ?? modules[0]?.id ?? "",
          title: "",
          slug: "",
          summary: "",
          description_md: "Describe the task here.\n",
          objectives: "",
          requirements: "",
          submission_instructions_md: "Submit a link to your repository or hosted notebook.",
          rubric_text: "Correctness | The work does what the brief asks. | 60\nReporting | Results are clearly presented and reproducible. | 40",
          due_at: "",
          is_published: false,
        }}
      />
    </EditorShell>
  );
}

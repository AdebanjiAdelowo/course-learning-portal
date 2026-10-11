import type { Metadata } from "next";

import { PythonPlayground } from "@/components/python-playground";
import { PageHeader } from "@/components/ui/page-header";
import { requireCourseState } from "@/lib/data/course";
import { playgroundExamples } from "@/lib/python/examples";

export const metadata: Metadata = { title: "Python playground" };

export default async function PlaygroundPage() {
  // Same access rule as the rest of the portal: signed in and enrolled.
  await requireCourseState();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Playground"
        title="Python playground"
        description="Write Python and run it at once. Start from an example, change it, and see what happens."
      />
      <PythonPlayground examples={playgroundExamples} />
    </div>
  );
}

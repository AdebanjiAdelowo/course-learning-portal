import type { Metadata } from "next";

import { requireStaff } from "@/lib/data/viewer";

import { LessonEditor } from "../lesson-editor";

export const metadata: Metadata = { title: "New lesson" };

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module: moduleId } = await searchParams;
  await requireStaff();
  return (
    <LessonEditor
      heading="New lesson"
      values={{
        module_id: moduleId ?? "",
        title: "",
        slug: "",
        summary: "",
        objectives: "",
        duration_minutes: 20,
        video_url: "",
        body_md: "## Introduction\n\nWrite the lesson here.\n",
        is_published: false,
      }}
    />
  );
}

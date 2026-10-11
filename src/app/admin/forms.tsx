"use client";

import type { ReactNode } from "react";

import { Checkbox, FormMessage, SelectField, SubmitButton, TextArea, TextField, useServerForm } from "@/components/ui/form";

import {
  createAnnouncement,
  createLiveSession,
  createModule,
  reviewSubmission,
  saveLesson,
  sendGeneralFeedback,
  updateModule,
} from "./actions";

const markdownHint = "Markdown, with LaTeX between $ signs.";

export function ReviewForm({ submissionId, maxPoints, defaultTitle }: { submissionId: string; maxPoints: number; defaultTitle: string }) {
  const { state, pending, formProps } = useServerForm(reviewSubmission);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="submission_id" value={submissionId} />
      <TextField label="Title" name="title" required maxLength={160} defaultValue={defaultTitle} errors={state.fieldErrors?.title} />
      <TextArea label="Comments" name="body_md" rows={10} required hint={markdownHint} errors={state.fieldErrors?.body_md} className="font-mono text-sm" />
      <TextField
        label={`Score out of ${maxPoints}`}
        name="score"
        type="number"
        inputMode="decimal"
        min={0}
        max={maxPoints}
        step="0.5"
        hint="Optional. Leave empty to give comments without a grade."
        errors={state.fieldErrors?.score}
        className="max-w-40"
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Sending…">Send feedback and mark as reviewed</SubmitButton>
    </form>
  );
}

export function GeneralFeedbackForm({ studentId }: { studentId: string }) {
  const { state, pending, formProps } = useServerForm(sendGeneralFeedback, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="student_id" value={studentId} />
      <TextField label="Title" name="title" required maxLength={160} errors={state.fieldErrors?.title} />
      <TextArea label="Comments" name="body_md" rows={6} required hint={markdownHint} errors={state.fieldErrors?.body_md} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Sending…">Send feedback</SubmitButton>
    </form>
  );
}

export function ModuleForm() {
  const { state, pending, formProps } = useServerForm(createModule, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-5">
      <TextField label="Title" name="title" required maxLength={160} errors={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" required maxLength={80} hint="Used in the URL: lowercase letters, numbers and hyphens." errors={state.fieldErrors?.slug} />
      <TextArea label="Description" name="description" rows={3} maxLength={600} errors={state.fieldErrors?.description} />
      <Checkbox label="Locked until the previous module's lessons are complete" name="requires_previous" defaultChecked />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Adding…">Add module</SubmitButton>
    </form>
  );
}

export interface ModuleEditValues {
  id: string;
  title: string;
  slug: string;
  description: string;
  phase_id: string | null;
  requires_previous: boolean;
  is_published: boolean;
}

export function ModuleEditForm({ values, phases }: { values: ModuleEditValues; phases: { id: string; label: string }[] }) {
  const { state, pending, formProps } = useServerForm(updateModule);
  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="module_id" value={values.id} />
      <TextField label="Title" name="title" required maxLength={160} defaultValue={values.title} errors={state.fieldErrors?.title} />
      <TextField
        label="Slug"
        name="slug_display"
        value={values.slug}
        readOnly
        hint="Fixed. Links, prerequisites and the seed files refer to a module by its slug."
      />
      <TextArea label="Description" name="description" rows={3} maxLength={600} defaultValue={values.description} errors={state.fieldErrors?.description} />
      <SelectField label="Phase" name="phase_id" defaultValue={values.phase_id ?? ""} errors={state.fieldErrors?.phase_id}>
        <option value="">Not assigned to a phase</option>
        {phases.map((phase) => (
          <option key={phase.id} value={phase.id}>
            {phase.label}
          </option>
        ))}
      </SelectField>
      <Checkbox
        label="Locked until the previous module's lessons are complete"
        name="requires_previous"
        defaultChecked={values.requires_previous}
      />
      <div>
        <Checkbox
          label="Published"
          name="is_published"
          defaultChecked={values.is_published}
          hint="A published module is open to enrolled students. An unpublished one stays on the learning path, labelled as planned, by title, description and plan only."
        />
        {state.fieldErrors?.is_published ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
            {state.fieldErrors.is_published.join(" ")}
          </p>
        ) : null}
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Save module</SubmitButton>
    </form>
  );
}

export interface LessonFormValues {
  id?: string;
  module_id: string;
  title: string;
  slug: string;
  summary: string;
  objectives: string;
  duration_minutes: number;
  video_url: string;
  body_md: string;
  is_published: boolean;
}

export function LessonForm({
  values,
  modules,
  notice,
}: {
  values: LessonFormValues;
  modules: { id: string; label: string }[];
  notice?: ReactNode;
}) {
  const { state, pending, formProps } = useServerForm(saveLesson);
  return (
    <form {...formProps} className="space-y-6">
      {values.id ? <input type="hidden" name="lesson_id" value={values.id} /> : null}
      {notice}
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Title" name="title" required maxLength={160} defaultValue={values.title} errors={state.fieldErrors?.title} />
        <TextField label="Slug" name="slug" required maxLength={80} defaultValue={values.slug} hint="Used in the URL. Changing it breaks existing links." errors={state.fieldErrors?.slug} />
        <SelectField label="Module" name="module_id" defaultValue={values.module_id} errors={state.fieldErrors?.module_id}>
          {modules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {mod.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Estimated duration (minutes)" name="duration_minutes" type="number" min={1} max={600} required defaultValue={values.duration_minutes} errors={state.fieldErrors?.duration_minutes} />
      </div>
      <TextArea label="Summary" name="summary" rows={2} maxLength={400} defaultValue={values.summary} hint="One or two sentences shown under the title and in search results." errors={state.fieldErrors?.summary} />
      <TextArea label="Learning objectives" name="objectives" rows={4} defaultValue={values.objectives} hint="One per line." errors={state.fieldErrors?.objectives} />
      <TextField label="Video link" name="video_url" type="url" defaultValue={values.video_url} hint="Optional. YouTube and Vimeo links are embedded; other links are shown as a link." errors={state.fieldErrors?.video_url} />
      <TextArea
        label="Lesson body"
        name="body_md"
        rows={28}
        defaultValue={values.body_md}
        hint="Markdown with tables, fenced code blocks (```python) and LaTeX: $inline$ and $$display$$."
        errors={state.fieldErrors?.body_md}
        className="font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
      <Checkbox label="Published" name="is_published" defaultChecked={values.is_published} hint="Unpublished lessons are hidden from students and do not count towards completion." />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">{values.id ? "Save lesson" : "Create lesson"}</SubmitButton>
    </form>
  );
}

export function AnnouncementForm() {
  const { state, pending, formProps } = useServerForm(createAnnouncement, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-5">
      <TextField label="Title" name="title" required maxLength={160} errors={state.fieldErrors?.title} />
      <TextArea label="Message" name="body_md" rows={5} required hint={markdownHint} errors={state.fieldErrors?.body_md} />
      <Checkbox label="Pin to the top" name="pinned" />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Publishing…">Publish announcement</SubmitButton>
    </form>
  );
}

export function SessionForm({ zones, defaultZone, defaultHost }: { zones: string[]; defaultZone: string; defaultHost: string }) {
  const { state, pending, formProps } = useServerForm(createLiveSession, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-5">
      <TextField label="Title" name="title" required maxLength={160} errors={state.fieldErrors?.title} />
      <TextArea label="Description" name="description" rows={3} maxLength={2000} errors={state.fieldErrors?.description} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Starts" name="starts_at" type="datetime-local" required errors={state.fieldErrors?.starts_at} />
        <TextField label="Duration (minutes)" name="duration_minutes" type="number" min={10} max={480} defaultValue={60} required errors={state.fieldErrors?.duration_minutes} />
      </div>
      <SelectField label="Time zone of the start time" name="timezone" defaultValue={defaultZone} errors={state.fieldErrors?.timezone}>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </SelectField>
      <TextField label="Host" name="instructor_name" required maxLength={120} defaultValue={defaultHost} errors={state.fieldErrors?.instructor_name} />
      <TextField label="Meeting link" name="meeting_url" type="url" placeholder="https://" errors={state.fieldErrors?.meeting_url} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Scheduling…">Schedule session</SubmitButton>
    </form>
  );
}

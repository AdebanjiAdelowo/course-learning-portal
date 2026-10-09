"use client";

import { useState, type ReactNode } from "react";

import { Checkbox, FormMessage, SelectField, SubmitButton, TextArea, TextField, useServerForm } from "@/components/ui/form";
import { slugify } from "@/lib/domain/authoring";
import type { QuestionType } from "@/lib/domain/quiz";

import { createResource, saveProject, saveQuestion, saveQuiz } from "./actions";

export interface ModuleOption {
  id: string;
  label: string;
}

const markdownHint = "Markdown, with LaTeX between $ signs.";

/**
 * Title and slug fields. For a new item the slug follows the title until the instructor edits
 * it by hand. Existing items keep their slug, because changing it breaks links.
 */
function TitleAndSlug({
  title,
  slug,
  isNew,
  errors,
}: {
  title: string;
  slug: string;
  isNew: boolean;
  errors?: { title?: string[]; slug?: string[] };
}) {
  const [slugValue, setSlugValue] = useState(slug);
  const [touched, setTouched] = useState(!isNew);
  return (
    <>
      <TextField
        label="Title"
        name="title"
        required
        maxLength={160}
        defaultValue={title}
        errors={errors?.title}
        onChange={(event) => {
          if (!touched) setSlugValue(slugify(event.target.value));
        }}
      />
      <TextField
        label="Slug"
        name="slug"
        required
        maxLength={80}
        value={slugValue}
        onChange={(event) => {
          setTouched(true);
          setSlugValue(event.target.value);
        }}
        hint={isNew ? "Used in the URL: lowercase letters, numbers and hyphens." : "Used in the URL. Changing it breaks existing links."}
        errors={errors?.slug}
      />
    </>
  );
}

function ModuleSelect({ modules, value, errors }: { modules: ModuleOption[]; value: string; errors?: string[] }) {
  return (
    <SelectField label="Module" name="module_id" defaultValue={value} errors={errors}>
      {modules.map((mod) => (
        <option key={mod.id} value={mod.id}>
          {mod.label}
        </option>
      ))}
    </SelectField>
  );
}

// ---------------------------------------------------------------------------

export interface QuizFormValues {
  id?: string;
  module_id: string;
  title: string;
  slug: string;
  description: string;
  pass_percent: number;
  max_attempts: number | null;
  is_published: boolean;
}

export function QuizForm({ values, modules, notice }: { values: QuizFormValues; modules: ModuleOption[]; notice?: ReactNode }) {
  const { state, pending, formProps } = useServerForm(saveQuiz);
  const isNew = !values.id;
  return (
    <form {...formProps} className="space-y-5">
      {values.id ? <input type="hidden" name="quiz_id" value={values.id} /> : null}
      {notice}
      <div className="grid gap-5 md:grid-cols-2">
        <TitleAndSlug title={values.title} slug={values.slug} isNew={isNew} errors={state.fieldErrors} />
        <ModuleSelect modules={modules} value={values.module_id} errors={state.fieldErrors?.module_id} />
        <div className="grid grid-cols-2 gap-5">
          <TextField label="Pass mark (%)" name="pass_percent" type="number" min={0} max={100} required defaultValue={values.pass_percent} errors={state.fieldErrors?.pass_percent} />
          <TextField label="Maximum attempts" name="max_attempts" type="number" min={1} max={50} defaultValue={values.max_attempts ?? ""} placeholder="Unlimited" errors={state.fieldErrors?.max_attempts} />
        </div>
      </div>
      <TextArea label="Description" name="description" rows={2} maxLength={600} defaultValue={values.description} hint="Shown above the quiz and in the quiz list." errors={state.fieldErrors?.description} />
      {isNew ? (
        <p className="rounded-lg bg-sunken px-3.5 py-2.5 text-sm text-ink-soft">
          A new quiz is saved as a draft. Add its questions on the next page, then publish it.
        </p>
      ) : (
        <div>
          <Checkbox
            label="Published"
            name="is_published"
            defaultChecked={values.is_published}
            hint="A published quiz is visible to students and counts towards their completion."
          />
          {state.fieldErrors?.is_published ? (
            <p className="mt-1.5 text-sm font-medium text-danger">{state.fieldErrors.is_published.join(" ")}</p>
          ) : null}
        </div>
      )}
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        {isNew ? "Create quiz" : "Save quiz settings"}
      </SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export interface QuestionFormValues {
  id?: string;
  type: QuestionType;
  prompt_md: string;
  options_text: string;
  true_false: string;
  accepted_text: string;
  explanation_md: string;
  points: number;
}

export const emptyQuestion: QuestionFormValues = {
  type: "multiple_choice",
  prompt_md: "",
  options_text: "",
  true_false: "true",
  accepted_text: "",
  explanation_md: "",
  points: 1,
};

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice (one correct answer)",
  multiple_select: "Multiple select (several correct answers)",
  true_false: "True or false",
  short_answer: "Short answer",
};

export function QuestionForm({ quizId, values }: { quizId: string; values: QuestionFormValues }) {
  const isNew = !values.id;
  const { state, pending, formProps } = useServerForm(saveQuestion, { resetOnSuccess: isNew });
  const [type, setType] = useState<QuestionType>(values.type);
  // Field ids must be unique on a page that shows one form per question.
  const key = values.id ?? "new";
  const choice = type === "multiple_choice" || type === "multiple_select";

  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="quiz_id" value={quizId} />
      {values.id ? <input type="hidden" name="question_id" value={values.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <SelectField
          label="Question type"
          name="type"
          id={`type-${key}`}
          value={type}
          onChange={(event) => setType(event.target.value as QuestionType)}
          errors={state.fieldErrors?.type}
        >
          {(Object.keys(typeLabels) as QuestionType[]).map((value) => (
            <option key={value} value={value}>
              {typeLabels[value]}
            </option>
          ))}
        </SelectField>
        <TextField label="Points" name="points" id={`points-${key}`} type="number" min={1} max={100} required defaultValue={values.points} errors={state.fieldErrors?.points} />
      </div>

      <TextArea label="Question" name="prompt_md" id={`prompt-${key}`} rows={3} required defaultValue={values.prompt_md} hint={markdownHint} errors={state.fieldErrors?.prompt_md} />

      {/* Fields for the other types stay in the form (hidden), so switching type loses nothing. */}
      <div hidden={!choice}>
        <TextArea
          label="Options"
          name="options_text"
          id={`options-${key}`}
          rows={5}
          defaultValue={values.options_text}
          hint={
            type === "multiple_select"
              ? "One option per line. Start every correct option with an asterisk (*)."
              : "One option per line. Start the correct option with an asterisk (*)."
          }
          errors={state.fieldErrors?.options_text}
          className="font-mono text-sm"
          spellCheck={false}
        />
      </div>
      <div hidden={type !== "true_false"}>
        <SelectField label="Correct answer" name="true_false" id={`tf-${key}`} defaultValue={values.true_false} errors={state.fieldErrors?.true_false}>
          <option value="true">True</option>
          <option value="false">False</option>
        </SelectField>
      </div>
      <div hidden={type !== "short_answer"}>
        <TextArea
          label="Accepted answers"
          name="accepted_text"
          id={`accepted-${key}`}
          rows={3}
          defaultValue={values.accepted_text}
          hint="One per line. Case and spacing are ignored, and numbers are compared by value (0.50 matches 0.5)."
          errors={state.fieldErrors?.accepted_text}
          className="font-mono text-sm"
          spellCheck={false}
        />
      </div>

      <TextArea
        label="Explanation"
        name="explanation_md"
        id={`explanation-${key}`}
        rows={3}
        defaultValue={values.explanation_md}
        hint="Shown to students after they submit, whether or not they were right."
        errors={state.fieldErrors?.explanation_md}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…" variant={isNew ? "primary" : "secondary"}>
        {isNew ? "Add question" : "Save question"}
      </SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export interface ProjectFormValues {
  id?: string;
  module_id: string;
  title: string;
  slug: string;
  summary: string;
  description_md: string;
  objectives: string;
  requirements: string;
  submission_instructions_md: string;
  rubric_text: string;
  due_at: string;
  is_published: boolean;
}

export function ProjectForm({
  values,
  modules,
  zoneLabel,
  notice,
}: {
  values: ProjectFormValues;
  modules: ModuleOption[];
  zoneLabel: string;
  notice?: ReactNode;
}) {
  const { state, pending, formProps } = useServerForm(saveProject);
  const isNew = !values.id;
  return (
    <form {...formProps} className="space-y-6">
      {values.id ? <input type="hidden" name="project_id" value={values.id} /> : null}
      {notice}
      <div className="grid gap-5 md:grid-cols-2">
        <TitleAndSlug title={values.title} slug={values.slug} isNew={isNew} errors={state.fieldErrors} />
        <ModuleSelect modules={modules} value={values.module_id} errors={state.fieldErrors?.module_id} />
        <TextField
          label="Deadline"
          name="due_at"
          type="datetime-local"
          defaultValue={values.due_at}
          hint={`Optional. In your time zone, ${zoneLabel}. Students see it in theirs.`}
          errors={state.fieldErrors?.due_at}
        />
      </div>
      <TextArea label="Summary" name="summary" rows={2} maxLength={400} defaultValue={values.summary} hint="One or two sentences shown in lists and search results." errors={state.fieldErrors?.summary} />
      <TextArea
        label="Brief"
        name="description_md"
        rows={14}
        defaultValue={values.description_md}
        hint={markdownHint}
        errors={state.fieldErrors?.description_md}
        className="font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextArea label="Objectives" name="objectives" rows={5} defaultValue={values.objectives} hint="One per line." errors={state.fieldErrors?.objectives} />
        <TextArea label="Requirements" name="requirements" rows={5} defaultValue={values.requirements} hint="One per line." errors={state.fieldErrors?.requirements} />
      </div>
      <TextArea
        label="Grading rubric"
        name="rubric_text"
        rows={6}
        required
        defaultValue={values.rubric_text}
        hint="One criterion per line, written as: Criterion | what you look for | points. The maximum score is the sum of the points."
        errors={state.fieldErrors?.rubric_text}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <TextArea
        label="Submission instructions"
        name="submission_instructions_md"
        rows={3}
        defaultValue={values.submission_instructions_md}
        hint="Shown above the submission form. Students submit a link to their work."
        errors={state.fieldErrors?.submission_instructions_md}
      />
      <Checkbox
        label="Published"
        name="is_published"
        defaultChecked={values.is_published}
        hint="A published project is visible to students and counts towards their completion."
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        {isNew ? "Create project" : "Save project"}
      </SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export interface ResourceTargetGroup {
  label: string;
  options: { value: string; label: string }[];
}

export function ResourceForm({ targets }: { targets: ResourceTargetGroup[] }) {
  const { state, pending, formProps } = useServerForm(createResource, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-5">
      <TextField label="Title" name="title" required maxLength={160} errors={state.fieldErrors?.title} />
      <TextField
        label="Link or file path"
        name="url"
        required
        placeholder="https://"
        hint="An https:// link, or the path of a file in the site's public folder, such as /resources/notes.pdf."
        errors={state.fieldErrors?.url}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Type" name="kind" defaultValue="link" errors={state.fieldErrors?.kind}>
          <option value="pdf">PDF</option>
          <option value="notebook">Notebook</option>
          <option value="dataset">Dataset</option>
          <option value="code">Code</option>
          <option value="video">Video</option>
          <option value="slides">Slides</option>
          <option value="reading">Reading</option>
          <option value="link">Link</option>
        </SelectField>
        <SelectField label="Belongs to" name="attachment" defaultValue="course" errors={state.fieldErrors?.attachment}>
          <option value="course">The whole course</option>
          {targets.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
      </div>
      <TextArea label="Description" name="description" rows={2} maxLength={400} errors={state.fieldErrors?.description} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Adding…">
        Add resource
      </SubmitButton>
    </form>
  );
}

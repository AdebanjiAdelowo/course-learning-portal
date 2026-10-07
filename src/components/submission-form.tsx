"use client";

import { saveSubmission } from "@/app/learn/actions/projects";
import { FormMessage, SubmitButton, TextArea, TextField, useServerForm } from "@/components/ui/form";

export function SubmissionForm({
  projectId,
  workUrl,
  notes,
  submitted,
}: {
  projectId: string;
  workUrl: string;
  notes: string;
  submitted: boolean;
}) {
  const { state, pending, formProps } = useServerForm(saveSubmission);

  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="project_id" value={projectId} />
      <TextField
        label="Link to your work"
        name="work_url"
        type="url"
        inputMode="url"
        placeholder="https://github.com/you/your-repository"
        defaultValue={workUrl}
        hint="A GitHub repository, a hosted notebook or a shared folder. It must start with https://"
        errors={state.fieldErrors?.work_url}
      />
      <TextArea
        label="Notes for your reviewer"
        name="notes"
        rows={5}
        defaultValue={notes}
        hint="Optional. Mention anything you want feedback on, or known gaps."
        errors={state.fieldErrors?.notes}
      />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending} name="intent" value="submit" pendingLabel="Saving…">
          {submitted ? "Update submission" : "Submit for review"}
        </SubmitButton>
        {submitted ? null : (
          <SubmitButton pending={pending} name="intent" value="save" variant="secondary" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

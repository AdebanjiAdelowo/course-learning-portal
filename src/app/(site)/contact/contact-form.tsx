"use client";

import { FormMessage, SelectField, SubmitButton, TextArea, TextField, useServerForm } from "@/components/ui/form";

import { sendContactMessage } from "./actions";

export function ContactForm() {
  const { state, pending, formProps } = useServerForm(sendContactMessage);
  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form {...formProps} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Your name" name="name" autoComplete="name" required maxLength={120} errors={state.fieldErrors?.name} />
        <TextField label="Email address" name="email" type="email" autoComplete="email" required errors={state.fieldErrors?.email} />
      </div>
      <SelectField label="What is this about?" name="topic" defaultValue="general" errors={state.fieldErrors?.topic}>
        <option value="general">General question</option>
        <option value="enrolment">Enrolment and the next cohort</option>
        <option value="access">I cannot access my account</option>
        <option value="technical">A technical problem with the portal</option>
      </SelectField>
      <TextArea label="Message" name="message" rows={6} required maxLength={5000} errors={state.fieldErrors?.message} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}

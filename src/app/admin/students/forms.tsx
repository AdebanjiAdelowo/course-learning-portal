"use client";
import { FormMessage, SelectField, SubmitButton, TextField, useServerForm } from "@/components/ui/form";
import { createStudent, setEnrolment } from "./actions";

type Option = { id: string; title: string };
export function CreateStudentForm({ courses }: { courses: Option[] }) {
  const { state, pending, formProps } = useServerForm(createStudent, { resetOnSuccess: true });
  return <form {...formProps} className="space-y-5">
    <TextField label="Full name" name="full_name" required autoComplete="off" errors={state.fieldErrors?.full_name} />
    <TextField label="Email" name="email" type="email" required autoComplete="off" errors={state.fieldErrors?.email} />
    <TextField label="Initial password" name="password" type="password" required autoComplete="new-password" minLength={10} maxLength={72} hint="At least 10 characters. Share privately; no email is sent." errors={state.fieldErrors?.password} />
    <SelectField label="Course" name="course_id" errors={state.fieldErrors?.course_id}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</SelectField>
    <FormMessage state={state} /><SubmitButton pending={pending} pendingLabel="Creating…">Create student and enrol</SubmitButton>
  </form>;
}
export function EnrolmentForm({ courses, students }: { courses: Option[]; students: Option[] }) {
  const { state, pending, formProps } = useServerForm(setEnrolment);
  return <form {...formProps} className="space-y-5">
    <SelectField label="Student" name="student_id" errors={state.fieldErrors?.student_id}>{students.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</SelectField>
    <SelectField label="Course" name="course_id" errors={state.fieldErrors?.course_id}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</SelectField>
    <SelectField label="Enrolment status" name="status" hint="Active and completed grant access. Paused and withdrawn remove access without deleting progress.">
      <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="withdrawn">Withdrawn</option>
    </SelectField>
    <FormMessage state={state} /><SubmitButton pending={pending} disabled={!students.length} pendingLabel="Saving…">Save enrolment</SubmitButton>
  </form>;
}

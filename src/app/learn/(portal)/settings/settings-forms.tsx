"use client";

import { updatePassword } from "@/app/learn/actions/auth";
import { updateProfile, updatePublicProfile } from "@/app/learn/actions/profile";
import { FormMessage, SelectField, SubmitButton, TextArea, TextField, useServerForm } from "@/components/ui/form";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function ProfileForm({
  fullName,
  timezone,
  bio,
  zones,
}: {
  fullName: string;
  timezone: string;
  bio: string;
  zones: string[];
}) {
  const { state, pending, formProps } = useServerForm(updateProfile);

  return (
    <form {...formProps} className="space-y-5">
      <TextField
        label="Full name"
        name="full_name"
        autoComplete="name"
        required
        maxLength={120}
        defaultValue={fullName}
        errors={state.fieldErrors?.full_name}
      />
      <SelectField
        label="Time zone"
        name="timezone"
        defaultValue={timezone}
        hint="Deadlines and live sessions are shown in this time zone."
        errors={state.fieldErrors?.timezone}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </SelectField>
      <TextArea
        label="About you"
        name="bio"
        rows={4}
        maxLength={2000}
        defaultValue={bio}
        hint="Optional. Your background and what you hope to get from the course. Visible to your instructor."
        errors={state.fieldErrors?.bio}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const { state, pending, formProps } = useServerForm(updatePassword, { resetOnSuccess: true });

  return (
    <form {...formProps} className="space-y-5">
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={state.fieldErrors?.password}
      />
      <TextField
        label="Repeat new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirm}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}

export function PublicProfileForm({ headline, avatarUrl, linksText }: { headline: string; avatarUrl: string; linksText: string }) {
  const { state, pending, formProps } = useServerForm(updatePublicProfile);

  return (
    <form {...formProps} className="space-y-5">
      <TextField
        label="Headline"
        name="headline"
        maxLength={160}
        defaultValue={headline}
        hint="One line under your name, for example your role."
        errors={state.fieldErrors?.headline}
      />
      <TextField
        label="Photo link"
        name="avatar_url"
        type="url"
        maxLength={500}
        defaultValue={avatarUrl}
        placeholder="https://"
        hint="Optional. An https:// link to a square image. Leave empty to show your initials."
        errors={state.fieldErrors?.avatar_url}
      />
      <TextArea
        label="Links"
        name="links_text"
        rows={4}
        defaultValue={linksText}
        hint="One per line, written as: Label | https://address. Only https links are accepted."
        errors={state.fieldErrors?.links_text}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Save public profile</SubmitButton>
    </form>
  );
}

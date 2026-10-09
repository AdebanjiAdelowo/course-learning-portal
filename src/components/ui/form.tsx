"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";
import { idleState, type FormState } from "@/lib/validation";

import { buttonClass } from "./button";

type FormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Connects a form to a server action that returns a `FormState`.
 *
 * With JavaScript the submission is dispatched by hand rather than through the form's `action`,
 * because React clears uncontrolled fields after a form action runs, and nobody should lose a
 * long lesson or a feedback draft to a validation error. Without JavaScript the same action
 * still works as an ordinary form post.
 */
export function useServerForm(
  action: FormAction,
  options: { initialState?: FormState; resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState(action, options.initialState ?? idleState);
  const ref = useRef<HTMLFormElement>(null);
  const { resetOnSuccess = false } = options;

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return { state, pending, formProps: { ref, action: dispatch, onSubmit, noValidate: true } };
}

interface FieldShellProps {
  label: string;
  name: string;
  /** Element id. Defaults to `name`; set it when the same field appears more than once on a page. */
  id?: string;
  hint?: ReactNode;
  errors?: string[];
}

function FieldShell({
  label,
  name,
  id = name,
  hint,
  errors,
  children,
}: FieldShellProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {errors?.length ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint: ReactNode, errors?: string[]) {
  const ids = [hint ? `${id}-hint` : null, errors?.length ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function TextField({
  label,
  name,
  id = name,
  hint,
  errors,
  className,
  ...props
}: FieldShellProps & Omit<ComponentProps<"input">, "name" | "id">) {
  return (
    <FieldShell label={label} name={name} id={id} hint={hint} errors={errors}>
      <input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id, hint, errors)}
        className={cn("field", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  name,
  id = name,
  hint,
  errors,
  className,
  ...props
}: FieldShellProps & Omit<ComponentProps<"textarea">, "name" | "id">) {
  return (
    <FieldShell label={label} name={name} id={id} hint={hint} errors={errors}>
      <textarea
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id, hint, errors)}
        className={cn("field min-h-28 leading-relaxed", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  id = name,
  hint,
  errors,
  className,
  children,
  ...props
}: FieldShellProps & Omit<ComponentProps<"select">, "name" | "id">) {
  return (
    <FieldShell label={label} name={name} id={id} hint={hint} errors={errors}>
      <select
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id, hint, errors)}
        className={cn("field", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  name,
  hint,
  ...props
}: { label: string; name: string; hint?: string } & Omit<ComponentProps<"input">, "name" | "type">) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        className="mt-1 size-4 shrink-0 accent-(--accent)"
        {...props}
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="block text-sm text-ink-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Submit button that disables itself and shows a spinner while its form action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  pending: formPending,
  variant = "primary",
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: string;
  /** Pass the value from `useServerForm`; plain server-action forms are detected automatically. */
  pending?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const status = useFormStatus();
  const pending = Boolean(formPending) || status.pending;
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Announces the outcome of a form action to sighted and screen-reader users alike. */
export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (state.status === "idle" || !state.message) return <div aria-live="polite" />;
  const success = state.status === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium",
        success
          ? "border-accent/25 bg-accent-soft text-accent-strong"
          : "border-danger/25 bg-danger-soft text-danger",
        className,
      )}
    >
      {success ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation";

import { buttonClass } from "./button";

interface FieldShellProps {
  label: string;
  name: string;
  hint?: ReactNode;
  errors?: string[];
}

function FieldShell({
  label,
  name,
  hint,
  errors,
  children,
}: FieldShellProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {errors?.length ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, hint: ReactNode, errors?: string[]) {
  const ids = [hint ? `${name}-hint` : null, errors?.length ? `${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function TextField({
  label,
  name,
  hint,
  errors,
  className,
  ...props
}: FieldShellProps & Omit<ComponentProps<"input">, "name">) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      <input
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(name, hint, errors)}
        className={cn("field", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  name,
  hint,
  errors,
  className,
  ...props
}: FieldShellProps & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      <textarea
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(name, hint, errors)}
        className={cn("field min-h-28 leading-relaxed", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  hint,
  errors,
  className,
  children,
  ...props
}: FieldShellProps & Omit<ComponentProps<"select">, "name">) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      <select
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(name, hint, errors)}
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
  variant = "primary",
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
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

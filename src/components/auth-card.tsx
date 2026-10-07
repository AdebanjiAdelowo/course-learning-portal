import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="card p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_-12px_rgb(0_0_0/0.12)] sm:p-9">
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-ink-soft">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
      {footer ? <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p> : null}
    </div>
  );
}

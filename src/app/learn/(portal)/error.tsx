"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow text-danger">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold">We could not load this page</h1>
      <p className="mt-3 text-ink-soft">
        Your progress is safe. Try again, and if the problem continues, contact the course team
        {error.digest ? ` and quote reference ${error.digest}` : ""}.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/learn" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}

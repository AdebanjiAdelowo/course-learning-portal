"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow text-danger">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold">This page could not be loaded</h1>
      <p className="mt-3 text-ink-soft">{error.digest ? `Reference ${error.digest}.` : "Please try again."}</p>
      <div className="mt-7 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}

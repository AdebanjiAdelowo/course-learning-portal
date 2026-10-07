import { ButtonLink } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-3 text-3xl font-semibold">That page is not part of your course</h1>
      <p className="mt-3 text-ink-soft">
        It may have been moved or unpublished, or it may belong to a module that has not opened yet.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <ButtonLink href="/learn/curriculum">Open the curriculum</ButtonLink>
        <ButtonLink href="/learn" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}

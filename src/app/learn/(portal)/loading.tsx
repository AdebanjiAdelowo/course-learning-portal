export default function PortalLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-8">
      <span className="sr-only">Loading…</span>
      <div className="space-y-3 border-b border-line pb-8">
        <div className="h-3 w-28 rounded bg-sunken" />
        <div className="h-9 w-2/3 max-w-md rounded bg-sunken" />
        <div className="h-5 w-1/2 max-w-sm rounded bg-sunken" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-44 rounded-xl bg-sunken" />
        <div className="h-44 rounded-xl bg-sunken" />
        <div className="h-32 rounded-xl bg-sunken md:col-span-2" />
      </div>
    </div>
  );
}

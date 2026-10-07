import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Brand />
      <p className="eyebrow mt-10">Error 404</p>
      <h1 className="mt-3 text-4xl font-semibold">Page not found</h1>
      <p className="mt-3 max-w-md text-ink-soft">The page you are looking for does not exist or has moved.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/learn" variant="secondary">Learning portal</ButtonLink>
      </div>
    </main>
  );
}

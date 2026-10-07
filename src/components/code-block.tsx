"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export function CodeBlock({ language, children }: { language: string | null; children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access denied: the code can still be selected by hand.
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-sunken">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-1.5">
        <span className="eyebrow">{language ?? "text"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre ref={preRef} tabIndex={0}>
        {children}
      </pre>
    </div>
  );
}

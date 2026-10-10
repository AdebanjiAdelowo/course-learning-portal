import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { cn } from "@/lib/cn";

import { parseVizBlock } from "@/lib/viz/parse";

import { AlgorithmPlayer } from "./algorithm-player";
import { CodeBlock } from "./code-block";

function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//.test(href);
}

function languageOf(className: unknown): string | null {
  const match = typeof className === "string" ? /language-([\w-]+)/.exec(className) : null;
  return match?.[1] ?? null;
}

const components: Components = {
  a({ href, children, node: _node, ...props }) {
    return isExternal(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  // Fenced code: rehype-highlight has already tokenised the children.
  pre({ children, node }) {
    const code = node?.children.find((child) => child.type === "element" && child.tagName === "code");
    const className = code && "properties" in code ? code.properties.className : undefined;
    const language = languageOf(Array.isArray(className) ? className.join(" ") : className);

    // ```viz blocks embed an interactive algorithm visualization (see src/lib/viz).
    if (language === "viz" && code && "children" in code) {
      const source = code.children.map((child) => ("value" in child ? child.value : "")).join("");
      const spec = parseVizBlock(source);
      if (!spec.ok) {
        return (
          <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
            This visualization could not be shown: {spec.error}
          </p>
        );
      }
      return <AlgorithmPlayer algorithmId={spec.value.algorithm.id} initialInput={spec.value.input} />;
    }

    return <CodeBlock language={language}>{children}</CodeBlock>;
  },
  // Wide tables scroll inside their own container instead of breaking the page on mobile.
  table({ children, node: _node, ...props }) {
    return (
      <div className="overflow-x-auto rounded-lg border border-line" tabIndex={0} role="region" aria-label="Table">
        <table {...props}>{children}</table>
      </div>
    );
  },
  // A paragraph holding only an image becomes a figure, with the image title as its caption.
  img({ src, alt, title, node: _node }) {
    if (typeof src !== "string") return null;
    return (
      <span className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- lesson figures are author-supplied URLs of unknown size */}
        <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="mx-auto" />
        {title ? <span className="mt-2 block text-center text-sm text-ink-faint">{title}</span> : null}
      </span>
    );
  },
};

/**
 * Renders author-written Markdown: GitHub-flavoured Markdown, LaTeX maths ($...$ and $$...$$)
 * via KaTeX, and syntax-highlighted code. Raw HTML in the source is not rendered, so content
 * stored in the database cannot inject markup or scripts.
 */
export function Markdown({
  children,
  className,
  ...props
}: { children: string; className?: string } & Omit<ComponentProps<"div">, "children">) {
  return (
    <div className={cn("prose", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, [rehypeKatex, { strict: false }], [rehypeHighlight, { detect: false, plainText: ["viz", "text"] }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

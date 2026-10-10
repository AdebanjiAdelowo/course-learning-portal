/**
 * Content-Security-Policy for every page.
 *
 * Scripts run only when they carry this request's nonce (Next.js adds it to its own scripts),
 * or are loaded by a script that does. Nothing else can execute: no inline handlers, no
 * injected <script>, no script from another origin.
 *
 * Deliberate allowances, each as narrow as the feature permits:
 *   style-src 'unsafe-inline'  KaTeX positions mathematics with inline style attributes, and
 *                              React renders computed styles (progress bars) the same way.
 *                              Styles cannot run code; scripts stay nonce-only.
 *   img-src https:             Lesson figures and the instructor photo are author-supplied
 *                              https addresses.
 *   frame-src                  Only the two video hosts that lesson embeds are rewritten to.
 */
export function buildContentSecurityPolicy(nonce: string, options: { development: boolean; https: boolean }): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${options.development ? " ws: wss:" : ""}`,
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.https ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

/** 128 bits of randomness, base64 encoded. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export const NONCE_HEADER = "x-nonce";

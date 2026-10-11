import { describe, expect, it } from "vitest";

import { DEFAULT_COURSE_SLUG, resolveCourseSlug, resolveSupportEmail, siteConfig } from "@/config/site";
import { buildContentSecurityPolicy, createNonce } from "@/lib/csp";
import { isPrivateFileUrl, isSafeObjectPath } from "@/lib/domain/files";
import { linksToText, parseLinksText, safeAvatarUrl, safeHttpsUrl, safeProfileLinks } from "@/lib/domain/profile";

describe("site configuration", () => {
  it("is branded DSA Academy and defaults to the DSA course", () => {
    expect(siteConfig.name).toBe("DSA Academy");
    expect(DEFAULT_COURSE_SLUG).toBe("data-structures-and-algorithms");
    expect(JSON.stringify(siteConfig)).not.toMatch(/isocline|scientific|machine learning/i);
  });

  it("uses a configured course slug when it is well formed", () => {
    expect(resolveCourseSlug("advanced-algorithms")).toBe("advanced-algorithms");
    expect(resolveCourseSlug("  dsa-2  ")).toBe("dsa-2");
  });

  it("falls back to the default for a missing or malformed slug", () => {
    for (const value of [undefined, "", "   ", "Has Spaces", "UPPER", "trailing-", "-leading", "a--b", "a/b", "'; drop table courses; --"]) {
      expect(resolveCourseSlug(value)).toBe(DEFAULT_COURSE_SLUG);
    }
  });

  it("shows a support address only when a real one is configured", () => {
    expect(resolveSupportEmail("help@dsa-academy.example")).toBe("help@dsa-academy.example");
    expect(resolveSupportEmail("  help@school.edu ")).toBe("help@school.edu");
    for (const value of [undefined, "", " ", "not-an-email", "a@b", "two@@x.com", "a b@x.com", 'x"@y.com', "<a@b.com>"]) {
      expect(resolveSupportEmail(value)).toBeNull();
    }
  });
});

describe("content security policy", () => {
  const production = buildContentSecurityPolicy("abc123", { development: false, https: true });

  it("allows scripts only by nonce, with no unsafe-inline or unsafe-eval in production", () => {
    const scripts = production.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scripts).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it("blocks plugins, framing and foreign form targets", () => {
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(production.split("; ")).toContain(directive);
    }
  });

  it("allows frames only from the two video hosts lessons embed", () => {
    expect(production).toContain("frame-src https://www.youtube-nocookie.com https://player.vimeo.com");
    expect(production).not.toMatch(/frame-src[^;]*\*/);
  });

  it("relaxes only what development tooling needs, and upgrades requests only on https", () => {
    const development = buildContentSecurityPolicy("n", { development: true, https: false });
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("connect-src 'self' ws: wss:");
    expect(development).not.toContain("upgrade-insecure-requests");
    expect(production).toContain("upgrade-insecure-requests");
    expect(production).toContain("connect-src 'self';");
  });

  it("creates a different, unguessable nonce each time", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => createNonce()));
    expect(nonces.size).toBe(200);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});

describe("profile links", () => {
  it("accepts plain https addresses", () => {
    expect(safeHttpsUrl("https://github.com/someone")).toBe("https://github.com/someone");
    expect(safeHttpsUrl("  https://example.org/a?b=1#c  ")).toBe("https://example.org/a?b=1#c");
  });

  it("rejects every other scheme, embedded credentials and malformed input", () => {
    for (const value of [
      "http://example.org",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:x",
      "//example.org",
      "/local/path",
      "https://user:pass@example.org",
      "https://exa mple.org",
      'https://example.org/"onmouseover="x',
      "https://example.org/<script>",
      "",
      "https://",
      `https://example.org/${"a".repeat(400)}`,
    ]) {
      expect(safeHttpsUrl(value)).toBeNull();
    }
  });

  it("keeps only well-formed links from a stored value", () => {
    expect(
      safeProfileLinks([
        { label: " GitHub ", url: "https://github.com/x" },
        { label: "Bad", url: "javascript:alert(1)" },
        { label: "", url: "https://example.org" },
        { label: "x".repeat(41), url: "https://example.org" },
        { url: "https://example.org" },
        "https://example.org",
        null,
      ]),
    ).toEqual([{ label: "GitHub", url: "https://github.com/x" }]);
    expect(safeProfileLinks("not an array")).toEqual([]);
    expect(safeProfileLinks(Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, url: "https://example.org" })))).toHaveLength(8);
  });

  it("parses the settings form format and round-trips it", () => {
    const parsed = parseLinksText("GitHub | https://github.com/x\n\n  Site|https://example.org/a|b  \n");
    expect(parsed).toEqual({
      ok: true,
      value: [
        { label: "GitHub", url: "https://github.com/x" },
        { label: "Site", url: "https://example.org/a|b" },
      ],
    });
    if (parsed.ok) expect(parseLinksText(linksToText(parsed.value))).toEqual(parsed);
    expect(parseLinksText("")).toEqual({ ok: true, value: [] });
  });

  it("reports the line that is wrong", () => {
    expect(parseLinksText("GitHub https://github.com/x")).toMatchObject({ ok: false, error: expect.stringContaining("Line 1") });
    expect(parseLinksText("A | https://a.example\nB | javascript:alert(1)")).toMatchObject({ ok: false, error: expect.stringContaining("Line 2") });
    expect(parseLinksText(" | https://a.example")).toMatchObject({ ok: false });
    expect(parseLinksText(Array.from({ length: 9 }, (_, i) => `L${i} | https://a.example`).join("\n"))).toMatchObject({ ok: false });
  });

  it("accepts an avatar that is https or a local file, and nothing else", () => {
    expect(safeAvatarUrl("https://example.org/me.jpg")).toBe("https://example.org/me.jpg");
    expect(safeAvatarUrl("/images/me.jpg")).toBe("/images/me.jpg");
    for (const value of ["//example.org/me.jpg", "/../secret", "javascript:alert(1)", "http://example.org/me.jpg", "", null, 5]) {
      expect(safeAvatarUrl(value)).toBeNull();
    }
  });
});

describe("private file paths", () => {
  it("accepts plain nested object paths", () => {
    for (const path of ["notes.pdf", "module-1/notes.pdf", "a/b/c/data_set.v2.csv"]) {
      expect(isSafeObjectPath(path)).toBe(true);
    }
  });

  it("rejects traversal, hidden files, empty segments and odd characters", () => {
    for (const path of ["", "../secret", "a/../b", "a//b", "/abs", "a/", ".env", "a/.hidden", "a b.pdf", "a%2e%2e/b", "a\\b", "a?x=1", "x".repeat(401)]) {
      expect(isSafeObjectPath(path)).toBe(false);
    }
  });

  it("recognises a resource address that points at a private file", () => {
    expect(isPrivateFileUrl("/learn/files/module-1/notes.pdf")).toBe(true);
    expect(isPrivateFileUrl("/figures/growth-rates.svg")).toBe(false);
    expect(isPrivateFileUrl("/learn/files/../admin")).toBe(false);
    expect(isPrivateFileUrl("https://example.org/learn/files/x.pdf")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { isSearchKind, searchKindOrder, searchResultHref } from "@/lib/domain/search";

describe("search result routing", () => {
  it("links each kind of content to its own route", () => {
    expect(searchResultHref("lesson", "binary-search", null)).toBe("/learn/lessons/binary-search");
    expect(searchResultHref("module", "correctness-and-cost", null)).toBe("/learn/modules/correctness-and-cost");
    expect(searchResultHref("project", "measuring-growth", null)).toBe("/learn/projects/measuring-growth");
  });

  it("links a coding problem to the practice area", () => {
    expect(searchResultHref("problem", "lower-bound", null)).toBe("/learn/practice/lower-bound");
  });

  it("recognises 'problem' as a result kind and lists it among the groups", () => {
    expect(isSearchKind("problem")).toBe(true);
    expect(searchKindOrder).toContain("problem");
  });

  it("rejects kinds the page does not know how to show", () => {
    for (const kind of ["quiz", "user", "", "PROBLEM", "__proto__", "constructor"]) {
      expect(isSearchKind(kind)).toBe(false);
    }
  });

  it("returns null, not a broken link, when a content row has no usable slug", () => {
    expect(searchResultHref("problem", null, null)).toBeNull();
    expect(searchResultHref("lesson", "", null)).toBeNull();
    expect(searchResultHref("lesson", "../admin", null)).toBeNull();
    expect(searchResultHref("module", "Has Spaces", null)).toBeNull();
    expect(searchResultHref("problem", "a/b", null)).toBeNull();
  });

  it("sends a resource to its address, or to the library when it has none", () => {
    expect(searchResultHref("resource", null, "https://docs.python.org/3/library/bisect.html")).toBe("https://docs.python.org/3/library/bisect.html");
    expect(searchResultHref("resource", null, "/learn/files/module-1/notes.pdf")).toBe("/learn/files/module-1/notes.pdf");
    expect(searchResultHref("resource", null, null)).toBe("/learn/resources");
  });

  it("refuses resource addresses that are not https or a local path", () => {
    expect(searchResultHref("resource", null, "javascript:alert(1)")).toBeNull();
    expect(searchResultHref("resource", null, "http://insecure.example/file")).toBeNull();
    expect(searchResultHref("resource", null, "//evil.example/file")).toBeNull();
    expect(searchResultHref("resource", null, "data:text/html,x")).toBeNull();
  });
});

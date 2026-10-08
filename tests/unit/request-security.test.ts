import { describe, expect, it } from "vitest";

import { isSameOriginMutation } from "@/lib/request-security";
import { safeNextPath } from "@/lib/supabase/session";

describe("mutation origin", () => {
  const request = (headers: HeadersInit) => new Request("https://portal.example/auth/signout", { method: "POST", headers });

  it("allows same-origin form posts", () => {
    expect(isSameOriginMutation(request({ origin: "https://portal.example" }))).toBe(true);
  });

  it("rejects cross-site, missing, opaque and malformed origins", () => {
    for (const origin of ["https://attacker.example", "null", "garbage", "http://portal.example", "https://portal.example:444"]) {
      expect(isSameOriginMutation(request({ origin }))).toBe(false);
    }
    expect(isSameOriginMutation(request({}))).toBe(false);
    expect(isSameOriginMutation(request({ origin: "https://portal.example", "sec-fetch-site": "cross-site" }))).toBe(false);
  });
});

describe("redirect canonicalisation", () => {
  it("rejects control characters that browsers strip before URL parsing", () => {
    for (const path of ["/\t/attacker.example", "/\n/attacker.example", "/\r/attacker.example", "/\u0000/attacker.example"]) {
      expect(safeNextPath(path)).toBe("/learn");
    }
  });

  it("canonicalises dot segments and preserves queries", () => {
    expect(safeNextPath("/learn/../learn/curriculum?q=heat%20flow")).toBe("/learn/curriculum?q=heat%20flow");
    expect(safeNextPath("//attacker.example")).toBe("/learn");
    expect(safeNextPath("/a/..//attacker.example")).toBe("/learn");
  });
});

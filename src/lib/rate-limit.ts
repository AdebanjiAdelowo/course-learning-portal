import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitRule {
  /** Names the limit, for example "contact:ip". */
  bucket: string;
  /** What is being limited: an address, an email. Hashed before it leaves this function. */
  key: string;
  limit: number;
  windowSeconds: number;
}

/** First address in X-Forwarded-For, as set by the hosting platform's proxy; null when absent. */
export function clientAddress(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip")?.trim() || "";
  return address !== "" && address.length <= 64 ? address : null;
}

/**
 * Counts a request against every rule and reports whether all of them still allow it.
 *
 * The counters live in Postgres (see `take_rate_limit`), so the limit holds across every server
 * instance without extra infrastructure. Only a SHA-256 hash of each key is stored. If the
 * database cannot be reached the request is refused: a limiter that fails open is not a limiter.
 *
 * The address comes from a proxy header. That is trustworthy only when the application runs
 * behind a proxy that overwrites the header, which is the case on the usual hosting platforms.
 */
export async function withinRateLimits(rules: readonly RateLimitRule[]): Promise<boolean> {
  const admin = createAdminClient();
  for (const rule of rules) {
    const { data, error } = await admin.rpc("take_rate_limit", {
      p_bucket: rule.bucket,
      p_key_hash: createHash("sha256").update(rule.key.toLowerCase()).digest("hex"),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error || data !== true) return false;
  }
  return true;
}

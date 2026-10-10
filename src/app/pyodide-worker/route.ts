import { type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { buildWorkerContentSecurityPolicy, buildWorkerScript } from "@/lib/python/worker-script";

const script = buildWorkerScript();

/**
 * Serves the Python worker's source with a Content-Security-Policy of its own.
 *
 * A worker loaded from a URL is governed by the policy sent with its script, not by the page's.
 * The policy here confines the worker to the Pyodide runtime files: code running inside it
 * cannot call this application (so it cannot act with the student's session), and cannot
 * contact any other host.
 */
export function GET(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origins = [request.nextUrl.origin, new URL(publicEnv().siteUrl).origin];
  if (forwardedHost && /^[A-Za-z0-9.-]+(:\d+)?$/.test(forwardedHost) && /^https?$/.test(forwardedProto)) {
    origins.push(`${forwardedProto}://${forwardedHost}`);
  }
  return new Response(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Security-Policy": buildWorkerContentSecurityPolicy(origins),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}

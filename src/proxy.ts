import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createNonce, NONCE_HEADER } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/session";

const CSP_HEADER = "Content-Security-Policy";

/** The learner portal, the instructor area and the auth callbacks need a session check. */
function needsSession(pathname: string): boolean {
  return /^\/(learn|admin|auth)(\/|$)/.test(pathname);
}

export async function proxy(request: NextRequest) {
  // A fresh nonce per request. Next.js reads it from the request's CSP header while rendering
  // and attaches it to its own scripts; the root layout reads it for the theme script.
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
  });
  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set(CSP_HEADER, policy);

  const response = needsSession(request.nextUrl.pathname) ? await updateSession(request) : NextResponse.next({ request });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Every page and route handler. Static assets need no policy and no session.
      source: "/((?!_next/static|_next/image|favicon.ico|figures/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

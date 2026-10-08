import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/** Portal routes that must stay reachable without a session. */
const PUBLIC_LEARN_PATHS = new Set(["/learn/login", "/learn/forgot-password"]);

function isProtected(pathname: string): boolean {
  if (PUBLIC_LEARN_PATHS.has(pathname)) return false;
  return (
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/** Only same-site paths are accepted as a post-login destination. */
export function safeNextPath(value: string | null | undefined, fallback = "/learn"): string {
  if (!value || !value.startsWith("/") || /[\\\x00-\x20\x7f]/.test(value)) return fallback;
  try {
    const base = "https://portal.invalid";
    const destination = new URL(value, base);
    if (destination.origin !== base || destination.pathname.startsWith("//")) return fallback;
    // Return the canonical path: dot segments cannot turn an apparently local path into
    // a protocol-relative redirect when another URL parser processes it later.
    return destination.pathname + destination.search + destination.hash;
  } catch {
    return fallback;
  }
}

/**
 * Runs on every matched request: refreshes the Supabase session cookies and turns away
 * visitors who are not signed in. Pages still check the session themselves (see
 * `requireViewer`), so this is a fast first gate rather than the only one.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = publicEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() validates the token with the auth server; do not replace it with getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
    const redirect = NextResponse.redirect(url);
    // Carry over any refreshed session cookies.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!user && isProtected(pathname)) {
    const next = pathname + search;
    return redirectTo("/learn/login", next === "/learn" ? undefined : { next });
  }

  if (user && PUBLIC_LEARN_PATHS.has(pathname)) {
    return redirectTo("/learn");
  }

  return response;
}

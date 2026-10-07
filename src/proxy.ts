import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // The learner portal, the admin area and the auth callbacks. The public website is static
  // marketing content and does not need a session.
  matcher: ["/learn", "/learn/:path*", "/admin", "/admin/:path*", "/auth/:path*"],
};

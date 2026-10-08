import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginMutation } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

/** Reject cross-site form posts before touching the session. */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/learn/login", request.url), { status: 303 });
}

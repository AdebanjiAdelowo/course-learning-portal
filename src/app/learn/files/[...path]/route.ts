import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/data/viewer";
import { isSafeObjectPath, COURSE_FILES_BUCKET, SIGNED_URL_SECONDS } from "@/lib/domain/files";
import { createClient } from "@/lib/supabase/server";

/**
 * Hands an enrolled student a short-lived link to a private course file.
 *
 * A resource whose address is `/learn/files/<path>` points at an object in the private
 * `course-files` storage bucket. This route is behind the session gate in `src/proxy.ts`; it
 * asks Storage for a signed URL as the signed-in user, so the bucket's policies (staff, or a
 * student with an active enrolment) decide whether a link is issued at all. The link expires
 * after a minute, so a copied address is of no use to anyone else.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/learn/login", request.url));

  const objectPath = (await params).path.join("/");
  if (!isSafeObjectPath(objectPath)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(COURSE_FILES_BUCKET).createSignedUrl(objectPath, SIGNED_URL_SECONDS, { download: true });
  // The same answer whether the file is missing or the viewer may not read it.
  if (error || !data?.signedUrl) return new NextResponse("Not found", { status: 404 });

  const response = NextResponse.redirect(data.signedUrl, { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

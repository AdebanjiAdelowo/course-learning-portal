import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

export interface Viewer {
  id: string;
  profile: Profile;
  isStaff: boolean;
}

/** The signed-in user and their profile, or null. Cached for the duration of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!profile) return null;

  return {
    id: user.id,
    profile,
    isStaff: profile.role === "instructor" || profile.role === "admin",
  };
});

/** Use at the top of every protected page, layout and server action. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/learn/login");
  return viewer;
}

/** Instructor and admin pages. Students are sent back to their dashboard. */
export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) redirect("/learn");
  return viewer;
}

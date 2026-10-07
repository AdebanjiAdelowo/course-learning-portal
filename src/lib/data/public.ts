import "server-only";

import { createClient } from "@supabase/supabase-js";

import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export interface PublicOutline {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: string | null;
  duration_weeks: number | null;
  outcomes: string[];
  prerequisites: string[];
  instructor: { full_name: string; bio: string | null } | null;
  modules: {
    position: number;
    title: string;
    description: string;
    lessons: { title: string; duration_minutes: number }[];
    quiz_count: number;
    projects: string[];
  }[];
}

/**
 * What the public website may show about the course. It is read with the anonymous key through
 * one database function that returns titles and descriptions only, never lesson content.
 * Returns null when the course is missing or the database cannot be reached, so the marketing
 * pages still render.
 */
export async function getPublicOutline(): Promise<PublicOutline | null> {
  try {
    const { supabaseUrl, supabaseAnonKey } = publicEnv();
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("public_course_outline", { p_slug: siteConfig.courseSlug });
    if (error || !data) return null;
    return data as unknown as PublicOutline;
  } catch {
    return null;
  }
}

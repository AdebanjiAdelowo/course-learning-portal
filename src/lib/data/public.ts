import "server-only";

import { createClient } from "@supabase/supabase-js";

import { siteConfig } from "@/config/site";
import { safeAvatarUrl, safeProfileLinks } from "@/lib/domain/profile";
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
  instructor: {
    full_name: string;
    headline: string | null;
    bio: string | null;
    avatar_url: string | null;
    links: { label: string; url: string }[];
  } | null;
  phases: { id: string; position: number; title: string; description: string }[];
  cohorts: { id: string; name: string; description: string; starts_on: string | null; ends_on: string | null; status: string }[];
  /** Every module on the learning path. Planned ones carry no lessons, only a plan. */
  modules: {
    position: number;
    phase_id: string | null;
    slug: string;
    title: string;
    description: string;
    is_published: boolean;
    plan: unknown;
    lessons: { title: string; duration_minutes: number }[];
    quiz_count: number;
    problem_count: number;
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
    const outline = data as unknown as PublicOutline;
    return {
      ...outline,
      phases: outline.phases ?? [],
      cohorts: outline.cohorts ?? [],
      modules: outline.modules ?? [],
      instructor: outline.instructor
        ? {
            ...outline.instructor,
            headline: outline.instructor.headline ?? null,
            avatar_url: safeAvatarUrl(outline.instructor.avatar_url),
            links: safeProfileLinks(outline.instructor.links),
          }
        : null,
    };
  } catch {
    return null;
  }
}

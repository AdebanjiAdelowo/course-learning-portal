/**
 * Brand and contact details for the whole site. Change these to rebrand the portal;
 * course-specific text (title, modules, lessons) lives in the database instead.
 */

export const DEFAULT_COURSE_SLUG = "data-structures-and-algorithms";

/**
 * The one course this deployment presents, teaches and manages. Every area (public website,
 * student portal, instructor area) resolves the course from this slug, so they can never
 * disagree about which course they mean. A malformed value falls back to the default.
 */
export function resolveCourseSlug(value: string | undefined): string {
  const slug = value?.trim();
  return slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : DEFAULT_COURSE_SLUG;
}

/** A support address is shown only when a real one is configured; none is invented. */
export function resolveSupportEmail(value: string | undefined): string | null {
  const email = value?.trim();
  return email && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) && email.length <= 254 ? email : null;
}

export const siteConfig = {
  name: "DSA Academy",
  tagline: "Learn Data Structures and Algorithms, from Foundations to Mastery.",
  description:
    "An interactive learning platform for mastering data structures, algorithms, problem-solving, and computational thinking through rigorous explanations, Python implementations, visualizations, and practical exercises.",
  supportEmail: resolveSupportEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  courseSlug: resolveCourseSlug(process.env.NEXT_PUBLIC_COURSE_SLUG),
} as const;

export const portalNav = [
  { href: "/learn", label: "Dashboard" },
  { href: "/learn/curriculum", label: "Curriculum" },
  { href: "/learn/practice", label: "Practice" },
  { href: "/learn/playground", label: "Playground" },
  { href: "/learn/projects", label: "Projects" },
  { href: "/learn/quizzes", label: "Quizzes" },
  { href: "/learn/sessions", label: "Live sessions" },
  { href: "/learn/resources", label: "Resources" },
  { href: "/learn/feedback", label: "Feedback" },
  { href: "/learn/progress", label: "Progress" },
] as const;

export const adminNav = [
  { href: "/admin/students", label: "Students" },
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/sessions", label: "Live sessions" },
  { href: "/admin/announcements", label: "Announcements" },
] as const;

/**
 * Brand and contact details for the whole site. Change these to rebrand the portal;
 * course-specific text (title, modules, lessons) lives in the database instead.
 */
export const siteConfig = {
  name: "Isocline",
  tagline: "Graduate-level courses in computational science",
  description:
    "A cohort-based learning portal for technical courses: structured lessons, graded projects, quizzes, live sessions and instructor feedback.",
  supportEmail: "support@example.com",
  courseSlug: process.env.NEXT_PUBLIC_COURSE_SLUG ?? "scientific-machine-learning",
} as const;

export const portalNav = [
  { href: "/learn", label: "Dashboard" },
  { href: "/learn/curriculum", label: "Curriculum" },
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

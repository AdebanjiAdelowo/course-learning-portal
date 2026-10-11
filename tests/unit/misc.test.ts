import { describe, expect, it } from "vitest";

import { toEmbedUrl } from "@/components/video-embed";
import { nearestSession, sessionStatus } from "@/lib/domain/sessions";
import { dueState, formatDuration, formatTime, initials, isValidTimeZone, relativeDays } from "@/lib/format";
import { safeNextPath } from "@/lib/supabase/session";
import { dateInZone, zonedDateTimeToUtc } from "@/lib/timezone";
import {
  contactSchema,
  lessonSchema,
  loginSchema,
  quizSubmissionSchema,
  submissionSchema,
  updatePasswordSchema,
} from "@/lib/validation";

const NOW = new Date("2026-10-07T12:00:00Z");
const UUID = "3f2b8c1e-6c1d-4f6e-9a55-0d6f2f5b7a10";

describe("sessionStatus", () => {
  it("derives the status from the clock", () => {
    expect(sessionStatus("2026-10-07T13:00:00Z", "2026-10-07T14:00:00Z", NOW)).toBe("upcoming");
    expect(sessionStatus("2026-10-07T11:30:00Z", "2026-10-07T12:30:00Z", NOW)).toBe("live");
    expect(sessionStatus("2026-10-07T10:00:00Z", "2026-10-07T11:00:00Z", NOW)).toBe("completed");
    // Boundaries: live from the start instant, completed from the end instant.
    expect(sessionStatus("2026-10-07T12:00:00Z", "2026-10-07T13:00:00Z", NOW)).toBe("live");
    expect(sessionStatus("2026-10-07T11:00:00Z", "2026-10-07T12:00:00Z", NOW)).toBe("completed");
  });

  it("features a live session, otherwise the soonest upcoming one", () => {
    const past = { id: "past", starts_at: "2026-10-01T10:00:00Z", ends_at: "2026-10-01T11:00:00Z" };
    const live = { id: "live", starts_at: "2026-10-07T11:30:00Z", ends_at: "2026-10-07T12:30:00Z" };
    const soon = { id: "soon", starts_at: "2026-10-09T10:00:00Z", ends_at: "2026-10-09T11:00:00Z" };
    const later = { id: "later", starts_at: "2026-10-20T10:00:00Z", ends_at: "2026-10-20T11:00:00Z" };
    expect(nearestSession([later, past, soon, live], NOW)?.id).toBe("live");
    expect(nearestSession([later, past, soon], NOW)?.id).toBe("soon");
    expect(nearestSession([past], NOW)).toBeNull();
  });
});

describe("time zones", () => {
  it("converts a wall-clock time to the right instant", () => {
    expect(zonedDateTimeToUtc("2026-07-01T17:00", "Europe/Rome").toISOString()).toBe("2026-07-01T15:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-12-01T17:00", "Europe/Rome").toISOString()).toBe("2026-12-01T16:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-12-01T09:30", "Asia/Kolkata").toISOString()).toBe("2026-12-01T04:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-03-10T23:30", "America/Los_Angeles").toISOString()).toBe("2026-03-11T06:30:00.000Z");
    expect(zonedDateTimeToUtc("2026-01-01T00:00", "UTC").toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("round-trips through formatting", () => {
    const instant = zonedDateTimeToUtc("2026-10-25T17:00", "Europe/Rome");
    expect(formatTime(instant.toISOString(), "Europe/Rome")).toBe("17:00");
    expect(dateInZone(instant, "Europe/Rome")).toBe("2026-10-25");
  });

  it("rejects malformed input", () => {
    expect(() => zonedDateTimeToUtc("tomorrow", "UTC")).toThrow();
    expect(isValidTimeZone("Europe/Rome")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(350)).toBe("5 h 50 min");
  });

  it("describes relative days", () => {
    expect(relativeDays("2026-10-12T12:00:00Z", NOW)).toBe("in 5 days");
    expect(relativeDays("2026-10-08T12:00:00Z", NOW)).toBe("tomorrow");
    expect(relativeDays("2026-10-04T12:00:00Z", NOW)).toBe("3 days ago");
    expect(relativeDays("2026-10-07T15:00:00Z", NOW)).toBe("in 3 h");
  });

  it("classifies deadlines", () => {
    expect(dueState(null, NOW)).toBe("none");
    expect(dueState("2026-10-06T00:00:00Z", NOW)).toBe("overdue");
    expect(dueState("2026-10-10T00:00:00Z", NOW)).toBe("soon");
    expect(dueState("2026-11-10T00:00:00Z", NOW)).toBe("later");
  });

  it("builds initials", () => {
    expect(initials("Amina Yusuf")).toBe("AY");
    expect(initials("Dr. Ada von Lovelace")).toBe("DL");
    expect(initials("Plato")).toBe("P");
    expect(initials("  ")).toBe("?");
  });
});

describe("safeNextPath", () => {
  it("accepts same-site paths", () => {
    expect(safeNextPath("/learn/lessons/binary-search")).toBe("/learn/lessons/binary-search");
    expect(safeNextPath("/learn/search?q=cfl")).toBe("/learn/search?q=cfl");
  });

  it("refuses anything that could leave the site", () => {
    for (const hostile of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNextPath(hostile)).toBe("/learn");
    }
  });
});

describe("toEmbedUrl", () => {
  it("embeds allow-listed video hosts without cookies", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=aircAruvnKk")).toBe("https://www.youtube-nocookie.com/embed/aircAruvnKk");
    expect(toEmbedUrl("https://youtu.be/aircAruvnKk")).toBe("https://www.youtube-nocookie.com/embed/aircAruvnKk");
    expect(toEmbedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("refuses other hosts and malformed ids", () => {
    expect(toEmbedUrl("https://evil.example/watch?v=aircAruvnKk")).toBeNull();
    expect(toEmbedUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(toEmbedUrl("not a url")).toBeNull();
  });
});

describe("validation", () => {
  it("normalises and checks login input", () => {
    expect(loginSchema.parse({ email: "  Student@Example.com ", password: "x" }).email).toBe("student@example.com");
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("enforces password length and confirmation", () => {
    expect(updatePasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
    expect(updatePasswordSchema.safeParse({ password: "long-enough-1", confirm: "different-1" }).success).toBe(false);
    expect(updatePasswordSchema.safeParse({ password: "long-enough-1", confirm: "long-enough-1" }).success).toBe(true);
  });

  it("requires an https link to submit a project but not to save a draft", () => {
    const base = { project_id: UUID, notes: "" };
    expect(submissionSchema.safeParse({ ...base, intent: "save", work_url: "" }).success).toBe(true);
    expect(submissionSchema.safeParse({ ...base, intent: "submit", work_url: "" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, intent: "submit", work_url: "http://insecure.example" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, intent: "submit", work_url: "javascript:alert(1)" }).success).toBe(false);
    expect(submissionSchema.parse({ ...base, intent: "submit", work_url: "https://github.com/a/b" }).work_url).toBe("https://github.com/a/b");
    expect(submissionSchema.parse({ ...base, intent: "save", work_url: "" }).work_url).toBeNull();
  });

  it("accepts only well-formed quiz answers", () => {
    expect(quizSubmissionSchema.safeParse({ quiz_id: UUID, answers: { [UUID]: "a" } }).success).toBe(true);
    expect(quizSubmissionSchema.safeParse({ quiz_id: UUID, answers: { [UUID]: ["a", "b"] } }).success).toBe(true);
    expect(quizSubmissionSchema.safeParse({ quiz_id: UUID, answers: { [UUID]: false } }).success).toBe(true);
    expect(quizSubmissionSchema.safeParse({ quiz_id: UUID, answers: { "not-a-uuid": "a" } }).success).toBe(false);
    expect(quizSubmissionSchema.safeParse({ quiz_id: UUID, answers: { [UUID]: { $ne: null } } }).success).toBe(false);
    expect(quizSubmissionSchema.safeParse({ quiz_id: "1", answers: {} }).success).toBe(false);
  });

  it("validates the contact form", () => {
    const good = { name: "Ada", email: "ada@example.com", topic: "access", message: "I cannot sign in to my account." };
    expect(contactSchema.safeParse(good).success).toBe(true);
    expect(contactSchema.safeParse({ ...good, topic: "spam" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...good, message: "short" }).success).toBe(false);
  });

  it("parses the lesson form, including one objective per line", () => {
    const parsed = lessonSchema.parse({
      module_id: UUID,
      title: " Stability ",
      slug: "stability-and-cfl",
      summary: "",
      objectives: "First\n\n  Second  \n",
      duration_minutes: "25",
      video_url: "",
      body_md: "## Body",
      is_published: "on",
    });
    expect(parsed).toMatchObject({ title: "Stability", objectives: ["First", "Second"], duration_minutes: 25, video_url: null, is_published: true });
    expect(lessonSchema.safeParse({ ...parsed, objectives: "", slug: "Not A Slug" }).success).toBe(false);
  });
});

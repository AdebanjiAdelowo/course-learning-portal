import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

test("instructor creates a student, pauses access and restores the enrolment", async ({ page, browser }) => {
  const email = `enrolment-test-${Date.now()}@example.com`;
  const password = "temporary-course-password-2026";
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  let userId: string | undefined;
  const studentContext = await browser.newContext();
  try {
    await page.goto("/learn/login");
    await page.getByLabel("Email address").fill("instructor@example.com");
    await page.getByLabel("Password").fill(process.env.SEED_DEMO_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/learn");
    await page.goto("/admin/students");
    const create = page.getByRole("region", { name: "New student" });
    await create.getByLabel("Full name").fill("Enrolment Test Student");
    await create.getByLabel("Email", { exact: true }).fill(email);
    await create.getByLabel("Initial password").fill(password);
    await create.getByRole("button", { name: "Create student and enrol" }).click();
    await expect(create.getByRole("status")).toContainText("Student created and enrolled");
    const profile = await admin.from("profiles").select("id").eq("email", email).single();
    userId = profile.data?.id;
    expect(userId).toBeTruthy();
    const student = await studentContext.newPage();
    await student.goto("/learn/login");
    await student.getByLabel("Email address").fill(email);
    await student.getByLabel("Password").fill(password);
    await student.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(student.getByRole("heading", { name: "Welcome back, Enrolment" })).toBeVisible();
    const edit = page.getByRole("region", { name: "Enrol or update an existing student" });
    await edit.getByLabel("Student", { exact: true }).selectOption(userId!);
    await edit.getByLabel("Enrolment status").selectOption("paused");
    await edit.getByRole("button", { name: "Save enrolment" }).click();
    await expect(edit.getByRole("status")).toContainText("Enrolment saved");
    await student.goto("/learn/curriculum");
    await expect(student.getByRole("heading", { name: "No active enrolment" })).toBeVisible();
    await edit.getByLabel("Enrolment status").selectOption("active");
    await edit.getByRole("button", { name: "Save enrolment" }).click();
    await expect(edit.getByRole("button", { name: "Save enrolment" })).toBeEnabled();
    await student.goto("/learn");
    await expect(student.getByRole("heading", { name: "Welcome back, Enrolment" })).toBeVisible();
  } finally {
    await studentContext.close();
    if (!userId) userId = (await admin.from("profiles").select("id").eq("email", email).maybeSingle()).data?.id;
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});

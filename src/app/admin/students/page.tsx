import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminCourse } from "@/lib/data/admin";
import { requireStaff } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { CreateStudentForm, EnrolmentForm } from "./forms";
export const metadata: Metadata = { title: "Students and enrolments" };
export default async function StudentsPage() {
  await requireStaff();
  // Students are enrolled in the configured course only; other courses in the database are ignored.
  const course = await getAdminCourse();
  if (!course) return <EmptyState title="No course yet">Load one with the seed script first.</EmptyState>;
  const db = await createClient();
  const [profiles, courses, enrolments] = await Promise.all([
    db.from("profiles").select("id,full_name,email").eq("role","student").order("full_name"),
    db.from("courses").select("id,title").eq("id", course.id),
    db.from("enrollments").select("id,user_id,course_id,status").eq("course_id", course.id),
  ]);
  if (profiles.error || courses.error || enrolments.error) throw new Error("Could not load students and enrolments.");
  const students=profiles.data.map(p => ({ id:p.id,title:`${p.full_name} (${p.email})` }));
  return <div className="space-y-10">
    <PageHeader eyebrow="Instructor area" title="Students and enrolments" description="Create student accounts, assign courses, and pause access while preserving progress." />
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card p-6" aria-labelledby="create-student"><h2 id="create-student" className="mb-5 text-xl font-semibold">New student</h2><CreateStudentForm courses={courses.data} /></section>
      <section className="card p-6" aria-labelledby="existing-student"><h2 id="existing-student" className="mb-5 text-xl font-semibold">Enrol or update an existing student</h2><EnrolmentForm courses={courses.data} students={students} /></section>
    </div>
    <section aria-labelledby="enrolments"><h2 id="enrolments" className="mb-4 text-xl font-semibold">Current enrolments</h2>
      <ul className="card divide-y divide-line">{enrolments.data.filter(e => profiles.data.some(p => p.id===e.user_id)).map(e => <li key={e.id} className="flex flex-wrap justify-between gap-2 p-4"><span>{profiles.data.find(p=>p.id===e.user_id)?.full_name} · {courses.data.find(c=>c.id===e.course_id)?.title}</span><span className="font-semibold capitalize">{e.status}</span></li>)}</ul>
    </section>
  </div>;
}

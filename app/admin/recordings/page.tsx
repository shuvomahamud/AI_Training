import Link from "next/link";
import { AddRecordingForm } from "@/components/recording-form";
import { RecordingAdminList } from "@/components/recording-admin-list";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Recording links" };

export default async function AdminRecordingsPage() {
  await requireAdmin();
  const courses = await db.query.courses.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      recordings: { orderBy: (table, { asc }) => [asc(table.position)] },
    },
  });

  const pickerCourses = courses.map((course) => ({
    id: course.id,
    title: course.title,
  }));
  const total = courses.reduce((sum, course) => sum + course.recordings.length, 0);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-3xl">Recording links</h1>
        <p className="mt-1 text-sm text-ink-600">
          Course recordings are a flat list of links. They are not tied to a
          section. Enrolled learners see them on the course recordings page.
        </p>
      </div>

      {pickerCourses.length === 0 ? (
        <EmptyState title="No courses yet">
          <Link className="underline" href="/admin/courses">
            Create a course
          </Link>{" "}
          before adding recording links.
        </EmptyState>
      ) : (
        <section className="grid gap-3">
          <h2 className="font-serif text-2xl">Add a recording link</h2>
          <AddRecordingForm courses={pickerCourses} />
        </section>
      )}

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">
          All recordings{" "}
          <span className="text-base font-normal text-ink-500">({total})</span>
        </h2>
        {courses.map((course) => (
          <article
            key={course.id}
            className="grid gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <h3 className="font-medium">
              <Link className="hover:underline" href={`/admin/courses/${course.id}`}>
                {course.title}
              </Link>{" "}
              <span className="text-sm font-normal text-ink-500">
                {course.status}
              </span>
            </h3>
            <RecordingAdminList recordings={course.recordings} />
          </article>
        ))}
      </section>
    </div>
  );
}

import Link from "next/link";
import { setCourseStatusAction } from "@/actions/courses";
import { CreateCourseForm } from "@/components/course-forms";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const list = await db.query.courses.findMany({
    with: { sessions: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-3xl">Courses</h1>
        <p className="mt-1 text-sm text-ink-600">
          Drafts stay hidden from learners until you publish them. Open a course
          to add sections (reading and a quiz) and course-level recording links.
        </p>
      </div>
      <CreateCourseForm />
      <ul className="grid gap-3">
        {list.map((course) => (
          <li
            key={course.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div>
              <Link className="font-medium hover:underline" href={`/admin/courses/${course.id}`}>
                {course.title}
              </Link>
              <p className="text-sm text-ink-500">
                {course.status} · {course.sessions.length} sections · /{course.slug}
              </p>
            </div>
            <form action={setCourseStatusAction}>
              <input type="hidden" name="id" value={course.id} />
              <input
                type="hidden"
                name="status"
                value={course.status === "published" ? "draft" : "published"}
              />
              <button className="btn secondary" type="submit">
                {course.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import { eq } from "drizzle-orm";
import { EnrollmentButton } from "@/components/enrollment-button";
import { EmptyState } from "@/components/ui";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const user = await getSession();
  const published = await db.query.courses.findMany({
    where: eq(courses.status, "published"),
    orderBy: (table, { asc }) => [asc(table.title)],
  });

  const enrollmentRows =
    user && user.role !== "admin"
      ? await db.query.enrollments.findMany({
          where: eq(enrollments.userId, user.id),
        })
      : [];
  const enrollmentByCourse = new Map(
    enrollmentRows.map((row) => [row.courseId, row.status]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Courses</h1>
      <p className="mt-2 max-w-2xl text-ink-600">
        Published programmes. Request access to open documents, live links, and
        quizzes.
      </p>
      {published.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No published courses yet">
            An admin will publish a course here when it is ready.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {published.map((course) => {
            const status = enrollmentByCourse.get(course.id) ?? "none";
            return (
              <li
                key={course.id}
                className="flex flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
              >
                <h2 className="font-serif text-2xl">
                  <Link className="hover:underline" href={`/courses/${course.slug}`}>
                    {course.title}
                  </Link>
                </h2>
                {course.summary ? (
                  <p className="mt-2 flex-1 text-sm text-ink-600">{course.summary}</p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-4">
                  {user?.role === "admin" || status === "approved" ? (
                    <Link className="btn primary" href={`/courses/${course.slug}`}>
                      Open course
                    </Link>
                  ) : user ? (
                    <EnrollmentButton
                      courseId={course.id}
                      status={status as "none" | "pending" | "rejected"}
                    />
                  ) : (
                    <Link
                      className="btn secondary"
                      href={`/login?next=/courses/${course.slug}`}
                    >
                      Log in to request access
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

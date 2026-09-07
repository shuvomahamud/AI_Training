import { decideEnrollmentAction } from "@/actions/enrollments";
import { LocalDate } from "@/components/local-time";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Enrollments" };

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; courseId?: string }>;
}) {
  await requireAdmin();
  const { status, courseId } = await searchParams;
  const statusFilter =
    status === "pending" || status === "approved" || status === "rejected"
      ? status
      : undefined;

  const courseList = await db.query.courses.findMany({
    orderBy: (table, { asc }) => [asc(table.title)],
  });

  const rows = await db.query.enrollments.findMany({
    where: and(
      statusFilter ? eq(enrollments.status, statusFilter) : undefined,
      courseId ? eq(enrollments.courseId, courseId) : undefined,
    ),
    with: { user: true, course: true },
    orderBy: [desc(enrollments.requestedAt)],
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Enrollments</h1>
      <form className="mt-4 flex flex-wrap gap-3 text-sm">
        <label className="grid gap-1">
          Status
          <select className="input" name="status" defaultValue={statusFilter ?? ""}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="grid gap-1">
          Course
          <select className="input" name="courseId" defaultValue={courseId ?? ""}>
            <option value="">All courses</option>
            {courseList.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <button className="btn secondary self-end" type="submit">
          Filter
        </button>
      </form>

      <ul className="mt-6 grid gap-3">
        {rows.length === 0 ? (
          <li className="text-sm text-ink-600">No enrollment requests match those filters.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium">
                  {row.user.name}{" "}
                  <span className="font-normal text-ink-500">{row.user.email}</span>
                </p>
                <p className="text-sm text-ink-600">
                  {row.course.title} · {row.status} · requested{" "}
                  <LocalDate iso={row.requestedAt.toISOString()} />
                </p>
              </div>
              {row.status === "pending" ? (
                <div className="flex gap-2">
                  <form action={decideEnrollmentAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="btn primary" type="submit">
                      Approve
                    </button>
                  </form>
                  <form action={decideEnrollmentAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="btn danger" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              ) : row.status === "rejected" ? (
                <form action={decideEnrollmentAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button className="btn secondary" type="submit">
                    Approve
                  </button>
                </form>
              ) : (
                <Link className="text-sm underline" href={`/admin/results/${row.courseId}`}>
                  Results
                </Link>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { LocalDate } from "@/components/local-time";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { enrollments, quizAttempts } from "@/lib/db/schema";

export const metadata = { title: "Admin" };

export default async function AdminHomePage() {
  await requireAdmin();
  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(enrollments)
    .where(eq(enrollments.status, "pending"));

  const recent = await db.query.quizAttempts.findMany({
    with: {
      user: true,
      version: { with: { quiz: { with: { session: { with: { course: true } } } } } },
    },
    orderBy: [desc(quizAttempts.submittedAt)],
    limit: 8,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/enrollments?status=pending"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <p className="text-sm text-ink-500">Pending enrollments</p>
          <p className="mt-2 font-serif text-4xl">{pendingCount}</p>
        </Link>
        <Link href="/admin/courses" className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-ink-500">Courses</p>
          <p className="mt-2 text-sm text-ink-700">Create, publish, and add sessions</p>
        </Link>
        <Link href="/admin/users" className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-ink-500">Users</p>
          <p className="mt-2 text-sm text-ink-700">Roles and password resets</p>
        </Link>
      </div>

      <h2 className="mt-10 font-serif text-2xl">Recent attempts</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-ink-600">No quiz attempts yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2 text-sm">
          {recent.map((attempt) => (
            <li key={attempt.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <Link
                className="font-medium hover:underline"
                href={`/admin/results/${attempt.version.quiz.session.courseId}`}
              >
                {attempt.user.name} · {attempt.version.quiz.title}
              </Link>
              <p className="text-ink-600">
                {attempt.score}/{attempt.maxScore}
                {attempt.passed ? " · passed" : " · not passed"} ·{" "}
                <LocalDate iso={attempt.submittedAt.toISOString()} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

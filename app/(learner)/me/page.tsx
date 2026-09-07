import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { LocalDate } from "@/components/local-time";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/db/schema";

export const metadata = { title: "My attempts" };

export default async function MePage() {
  const user = await requireUser();
  const attempts = await db.query.quizAttempts.findMany({
    where: eq(quizAttempts.userId, user.id),
    with: {
      version: {
        with: {
          quiz: {
            with: { session: { with: { course: true } } },
          },
        },
      },
    },
    orderBy: [desc(quizAttempts.submittedAt)],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl">Account</h1>
      <dl className="mt-6 grid gap-2 text-sm">
        <div>
          <dt className="text-ink-500">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Role</dt>
          <dd className="capitalize">{user.role}</dd>
        </div>
      </dl>

      <h2 className="mt-10 font-serif text-2xl">Quiz attempts</h2>
      {attempts.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No attempts yet">
            Open a course session and take a quiz. Every try is kept.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {attempts.map((attempt) => {
            const course = attempt.version.quiz.session.course;
            const session = attempt.version.quiz.session;
            return (
              <li
                key={attempt.id}
                className="rounded-xl border border-ink-200 bg-white p-4 text-sm"
              >
                <p className="font-medium">{attempt.version.quiz.title}</p>
                <p className="text-ink-600">
                  <Link className="underline-offset-2 hover:underline" href={`/courses/${course.slug}`}>
                    {course.title}
                  </Link>
                  {" · "}
                  <Link
                    className="underline-offset-2 hover:underline"
                    href={`/courses/${course.slug}/sessions/${session.position}`}
                  >
                    Session {session.position}
                  </Link>
                </p>
                <p className="mt-1 text-ink-600">
                  Attempt {attempt.attemptNumber} · version {attempt.version.versionNumber} ·{" "}
                  {attempt.score}/{attempt.maxScore}
                  {attempt.passed ? " · passed" : " · not passed"}
                  {attempt.safetyCriticalPassed
                    ? " · safety-critical ok"
                    : " · safety-critical missed"}
                </p>
                <p className="text-ink-500">
                  <LocalDate iso={attempt.submittedAt.toISOString()} />
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

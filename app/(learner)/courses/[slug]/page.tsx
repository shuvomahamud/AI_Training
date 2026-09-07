import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { EnrollmentButton } from "@/components/enrollment-button";
import { LocalDate } from "@/components/local-time";
import { EmptyState } from "@/components/ui";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });
  return { title: course?.title ?? "Course" };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSession();
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
    with: {
      sessions: { orderBy: (table, { asc }) => [asc(table.position)] },
    },
  });

  if (!course) notFound();
  if (course.status !== "published" && user?.role !== "admin") notFound();

  const enrollment =
    user && user.role !== "admin"
      ? await db.query.enrollments.findFirst({
          where: and(
            eq(enrollments.courseId, course.id),
            eq(enrollments.userId, user.id),
          ),
        })
      : null;

  const approved = user?.role === "admin" || enrollment?.status === "approved";

  const groups: { title: string | null; sessions: typeof course.sessions }[] = [];
  for (const session of course.sessions) {
    const title = session.moduleTitle ?? null;
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.sessions.push(session);
    else groups.push({ title, sessions: [session] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-ink-500">
        <Link href="/courses">Courses</Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl">{course.title}</h1>
      {course.summary ? (
        <p className="mt-3 text-lg text-ink-600">{course.summary}</p>
      ) : null}

      <div className="mt-8">
        {!user ? (
          <Link className="btn primary" href={`/login?next=/courses/${course.slug}`}>
            Log in to request access
          </Link>
        ) : approved ? null : (
          <EnrollmentButton
            courseId={course.id}
            status={(enrollment?.status as "pending" | "rejected") ?? "none"}
          />
        )}
      </div>

      {approved ? (
        <div className="mt-10 grid gap-8">
          {course.sessions.length === 0 ? (
            <EmptyState title="No sessions yet">
              An admin will add live sessions to this course.
            </EmptyState>
          ) : (
            groups.map((group, index) => (
              <section key={`${group.title ?? "none"}-${index}`}>
                {group.title ? (
                  <h2 className="mb-3 font-serif text-xl text-ink-700">
                    {group.title}
                  </h2>
                ) : null}
                <ol className="grid gap-3">
                  {group.sessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={`/courses/${course.slug}/sessions/${session.position}`}
                        className="block rounded-xl border border-border bg-surface p-4 hover:border-accent-500"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Session {session.position}
                        </p>
                        <h3 className="mt-1 font-medium">{session.title}</h3>
                        {session.summary ? (
                          <p className="mt-1 text-sm text-ink-600">{session.summary}</p>
                        ) : null}
                        {session.scheduledAt ? (
                          <p className="mt-2 text-sm text-ink-500">
                            <LocalDate iso={session.scheduledAt.toISOString()} />
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

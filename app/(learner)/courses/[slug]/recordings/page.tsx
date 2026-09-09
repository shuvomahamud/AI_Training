import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDate } from "@/components/local-time";
import { EmptyState } from "@/components/ui";
import { requireEnrollment } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });
  return { title: course ? `Recordings — ${course.title}` : "Recordings" };
}

export default async function CourseRecordingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
    with: {
      sessions: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: {
          recordings: { orderBy: (table, { asc }) => [asc(table.position)] },
        },
      },
    },
  });
  if (!course) notFound();

  await requireEnrollment(course.id);

  const withRecordings = course.sessions.filter(
    (session) => session.recordings.length > 0,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-ink-500">
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl">Recordings</h1>
      <p className="mt-3 text-ink-600">
        Every recorded live session for this course, newest sections last.
      </p>

      {withRecordings.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No recordings posted yet">
            Recordings appear here after each live session.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          {withRecordings.map((session) => (
            <section
              key={session.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Section {session.position}
              </p>
              <h2 className="mt-1 font-medium">
                <Link
                  className="hover:underline"
                  href={`/courses/${course.slug}/sessions/${session.position}`}
                >
                  {session.title}
                </Link>
              </h2>
              <ul className="mt-3 grid gap-2">
                {session.recordings.map((recording) => (
                  <li key={recording.id}>
                    <a
                      className="text-accent-700 underline-offset-2 hover:underline"
                      href={recording.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {recording.label}
                    </a>
                    {recording.recordedAt ? (
                      <span className="ml-2 text-sm text-ink-500">
                        <LocalDate iso={recording.recordedAt.toISOString()} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

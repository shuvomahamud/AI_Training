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
      recordings: { orderBy: (table, { asc }) => [asc(table.position)] },
    },
  });
  if (!course) notFound();

  await requireEnrollment(course.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-ink-500">
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl">Recordings</h1>
      <p className="mt-3 text-ink-600">
        Recorded live sessions for this course. These links are not tied to a
        section.
      </p>

      {course.recordings.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No recordings posted yet">
            Recordings appear here after an admin adds a link.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {course.recordings.map((recording) => (
            <li
              key={recording.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <a
                className="font-medium text-accent-700 underline-offset-2 hover:underline"
                href={recording.url}
                target="_blank"
                rel="noreferrer"
              >
                {recording.label}
              </a>
              {recording.recordedAt ? (
                <p className="mt-1 text-sm text-ink-500">
                  <LocalDate iso={recording.recordedAt.toISOString()} />
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

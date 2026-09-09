import Link from "next/link";
import { deleteRecordingAction } from "@/actions/recordings";
import { LocalDate } from "@/components/local-time";
import { AddRecordingToSectionForm } from "@/components/recording-form";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Recording links" };

export default async function AdminRecordingsPage() {
  await requireAdmin();
  const courses = await db.query.courses.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      sessions: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: {
          recordings: { orderBy: (table, { asc }) => [asc(table.position)] },
        },
      },
    },
  });

  const pickerSections = courses.flatMap((course) =>
    course.sessions.map((session) => ({
      id: session.id,
      label: `${course.title} — Section ${session.position}: ${session.title}`,
    })),
  );

  const total = courses.reduce(
    (sum, course) =>
      sum +
      course.sessions.reduce(
        (inner, session) => inner + session.recordings.length,
        0,
      ),
    0,
  );

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-3xl">Recording links</h1>
        <p className="mt-1 text-sm text-ink-600">
          Every live-session recording across all courses, in one place. Paste a
          link here and it appears on that section for enrolled learners.
        </p>
      </div>

      {pickerSections.length === 0 ? (
        <EmptyState title="No sections yet">
          <Link className="underline" href="/admin/courses">
            Create a course and add a section
          </Link>{" "}
          before adding recording links.
        </EmptyState>
      ) : (
        <section className="grid gap-3">
          <h2 className="font-serif text-2xl">Add a recording link</h2>
          <AddRecordingToSectionForm sections={pickerSections} />
        </section>
      )}

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">
          All recordings{" "}
          <span className="text-base font-normal text-ink-500">({total})</span>
        </h2>
        {courses.map((course) => (
          <article key={course.id} className="grid gap-3">
            <h3 className="font-medium">
              <Link className="hover:underline" href={`/admin/courses/${course.id}`}>
                {course.title}
              </Link>{" "}
              <span className="text-sm font-normal text-ink-500">
                {course.status}
              </span>
            </h3>
            <ul className="grid gap-2">
              {course.sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        Section {session.position}
                      </span>
                      <br />
                      {session.title}
                    </p>
                    <Link
                      className="btn ghost !py-1.5"
                      href={`/admin/sessions/${session.id}#recordings`}
                    >
                      Open section
                    </Link>
                  </div>
                  {session.recordings.length === 0 ? (
                    <p className="mt-3 rounded-lg border border-warn-border bg-warn-surface px-3 py-2 text-sm text-warn">
                      No recording link yet.
                    </p>
                  ) : (
                    <ul className="mt-3 grid gap-2">
                      {session.recordings.map((recording) => (
                        <li
                          key={recording.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <span className="min-w-0">
                            <a
                              className="underline"
                              href={recording.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {recording.label}
                            </a>
                            {recording.recordedAt ? (
                              <span className="ml-2 text-ink-500">
                                <LocalDate iso={recording.recordedAt.toISOString()} />
                              </span>
                            ) : null}
                          </span>
                          <form action={deleteRecordingAction}>
                            <input type="hidden" name="id" value={recording.id} />
                            <button className="btn danger" type="submit">
                              Delete
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}

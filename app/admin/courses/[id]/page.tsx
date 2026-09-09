import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteSessionAction,
  moveSessionAction,
} from "@/actions/sessions";
import { EditCourseForm } from "@/components/course-forms";
import { CreateSessionForm } from "@/components/session-forms";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Edit course" };

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    with: {
      sessions: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: {
          documents: true,
          recordings: true,
          quizzes: true,
        },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="grid gap-10">
      <div>
        <p className="text-sm text-ink-500">
          <Link href="/admin/courses">Courses</Link>
        </p>
        <h1 className="font-serif text-3xl">{course.title}</h1>
        <p className="mt-1 text-sm text-ink-600">
          Each section has three things to add: reading, a recording link, and a
          quiz. Click a section to upload them. Learners see the same three on
          the section page.
        </p>
        <p className="mt-1 text-sm">
          <Link className="underline" href={`/courses/${course.slug}`}>
            View learner page
          </Link>
          {" · "}
          <Link className="underline" href={`/admin/results/${course.id}`}>
            Quiz results
          </Link>
        </p>
      </div>

      <EditCourseForm
        id={course.id}
        title={course.title}
        summary={course.summary ?? ""}
        liveUrl={course.liveUrl ?? ""}
        slug={course.slug}
      />

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">Sections</h2>
        <p className="text-sm text-ink-600">
          Open a section to add its reading, recording link, and quiz. Learners
          then read and take the quiz on that section page.
        </p>
        {course.sessions.length === 0 ? (
          <EmptyState title="No sections yet">
            Add a section below. Then open it to add reading, a recording, and a
            quiz.
          </EmptyState>
        ) : (
          <ol className="grid gap-3">
            {course.sessions.map((session, index) => {
              const readingCount = session.documents.length;
              const recordingCount = session.recordings.length;
              const quizCount = session.quizzes.length;
              return (
                <li
                  key={session.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        Section {session.position}
                      </p>
                      <h3 className="mt-1 font-medium">{session.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={moveSessionAction}>
                        <input type="hidden" name="id" value={session.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="btn ghost" type="submit" disabled={index === 0}>
                          Up
                        </button>
                      </form>
                      <form action={moveSessionAction}>
                        <input type="hidden" name="id" value={session.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          className="btn ghost"
                          type="submit"
                          disabled={index === course.sessions.length - 1}
                        >
                          Down
                        </button>
                      </form>
                      <form action={deleteSessionAction}>
                        <input type="hidden" name="id" value={session.id} />
                        <button className="btn danger" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <li>
                      <Link
                        className="block rounded-lg border border-border px-3 py-2 hover:border-accent-500"
                        href={`/admin/sessions/${session.id}#reading`}
                      >
                        <span className="font-medium">1. Reading</span>
                        <span className="mt-0.5 block text-ink-600">
                          {readingCount === 0
                            ? "Not added yet"
                            : countLabel(readingCount, "page", "pages")}
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="block rounded-lg border border-border px-3 py-2 hover:border-accent-500"
                        href={`/admin/sessions/${session.id}#recordings`}
                      >
                        <span className="font-medium">2. Recording</span>
                        <span className="mt-0.5 block text-ink-600">
                          {recordingCount === 0
                            ? "Not added yet"
                            : countLabel(recordingCount, "link", "links")}
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="block rounded-lg border border-border px-3 py-2 hover:border-accent-500"
                        href={`/admin/sessions/${session.id}#quiz`}
                      >
                        <span className="font-medium">3. Quiz</span>
                        <span className="mt-0.5 block text-ink-600">
                          {quizCount === 0
                            ? "Not added yet"
                            : countLabel(quizCount, "quiz", "quizzes")}
                        </span>
                      </Link>
                    </li>
                  </ul>
                  <p className="mt-3">
                    <Link className="btn primary" href={`/admin/sessions/${session.id}`}>
                      Open section and add materials
                    </Link>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
        <div className="grid gap-2">
          <h3 className="font-medium">Add a section</h3>
          <CreateSessionForm courseId={course.id} />
        </div>
      </section>
    </div>
  );
}

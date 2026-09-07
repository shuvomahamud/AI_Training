import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteSessionAction,
  moveSessionAction,
} from "@/actions/sessions";
import { EditCourseForm } from "@/components/course-forms";
import { CreateSessionForm } from "@/components/session-forms";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Edit course" };

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
      sessions: { orderBy: (table, { asc }) => [asc(table.position)] },
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
        <h2 className="font-serif text-2xl">Sessions</h2>
        <ol className="grid gap-2">
          {course.sessions.map((session, index) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3"
            >
              <Link className="font-medium hover:underline" href={`/admin/sessions/${session.id}`}>
                {session.position}. {session.title}
              </Link>
              <div className="flex gap-2">
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
            </li>
          ))}
        </ol>
        <CreateSessionForm courseId={course.id} />
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDocumentAction } from "@/actions/documents";
import { deleteQuizAction } from "@/actions/quizzes";
import { deleteRecordingAction } from "@/actions/recordings";
import { DocumentUpload } from "@/components/document-upload";
import { CreateQuizForm, EditQuizForm } from "@/components/quiz-editor";
import { AddRecordingForm } from "@/components/recording-form";
import { EditSessionForm } from "@/components/session-forms";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const maxDuration = 60;
export const metadata = { title: "Edit session" };

export default async function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const session = await db.query.sessions.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    with: {
      course: true,
      documents: { orderBy: (table, { asc }) => [asc(table.position)] },
      recordings: { orderBy: (table, { asc }) => [asc(table.position)] },
      quizzes: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: { currentVersion: true, versions: true },
      },
    },
  });
  if (!session) notFound();

  return (
    <div className="grid gap-10">
      <div>
        <p className="text-sm text-ink-500">
          <Link href={`/admin/courses/${session.courseId}`}>{session.course.title}</Link>
        </p>
        <h1 className="font-serif text-3xl">
          Session {session.position}: {session.title}
        </h1>
      </div>

      <EditSessionForm
        id={session.id}
        title={session.title}
        summary={session.summary ?? ""}
        moduleTitle={session.moduleTitle ?? ""}
        liveUrl={session.liveUrl ?? ""}
        scheduledAt={session.scheduledAt?.toISOString() ?? null}
      />

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">Documents</h2>
        <ul className="grid gap-2">
          {session.documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm"
            >
              <span>
                {document.title}{" "}
                <span className="text-ink-500">({document.sourceType})</span>
              </span>
              <form action={deleteDocumentAction}>
                <input type="hidden" name="id" value={document.id} />
                <button className="btn danger" type="submit">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        <DocumentUpload sessionId={session.id} />
      </section>

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">Recordings</h2>
        <ul className="grid gap-2">
          {session.recordings.map((recording) => (
            <li
              key={recording.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm"
            >
              <a className="underline" href={recording.url} target="_blank" rel="noreferrer">
                {recording.label}
              </a>
              <form action={deleteRecordingAction}>
                <input type="hidden" name="id" value={recording.id} />
                <button className="btn danger" type="submit">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        <AddRecordingForm sessionId={session.id} />
      </section>

      <section className="grid gap-6">
        <h2 className="font-serif text-2xl">Quizzes</h2>
        {session.quizzes.map((quiz) => (
          <article key={quiz.id} className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                {quiz.title}{" "}
                <span className="text-sm font-normal text-ink-500">
                  {quiz.versions.length} version{quiz.versions.length === 1 ? "" : "s"}
                </span>
              </h3>
              <form action={deleteQuizAction}>
                <input type="hidden" name="id" value={quiz.id} />
                <button className="btn danger" type="submit">
                  Delete quiz
                </button>
              </form>
            </div>
            <EditQuizForm
              quizId={quiz.id}
              initialJson={JSON.stringify(quiz.currentVersion?.json ?? {}, null, 2)}
            />
          </article>
        ))}
        <div className="rounded-xl border border-dashed border-ink-200 p-4">
          <h3 className="mb-3 font-medium">Add a quiz</h3>
          <CreateQuizForm sessionId={session.id} />
        </div>
      </section>
    </div>
  );
}

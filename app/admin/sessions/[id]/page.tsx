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
export const metadata = { title: "Edit section" };

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
          Section {session.position}: {session.title}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Add the three learner pieces for this section: reading, a recording
          link, and a quiz.
        </p>
      </div>

      <EditSessionForm
        id={session.id}
        title={session.title}
        summary={session.summary ?? ""}
        moduleTitle={session.moduleTitle ?? ""}
        liveUrl={session.liveUrl ?? ""}
        scheduledAt={session.scheduledAt?.toISOString() ?? null}
      />

      <section id="reading" className="grid scroll-mt-6 gap-4">
        <h2 className="font-serif text-2xl">1. Reading</h2>
        <p className="text-sm text-ink-600">
          Learners read this on the section page. Prefer pasted Markdown. You
          can also upload a .docx or PDF.
        </p>
        {session.documents.length === 0 ? (
          <p className="rounded-lg border border-warn-border bg-warn-surface px-4 py-3 text-sm text-warn">
            No reading yet. Save text below or upload a file.
          </p>
        ) : (
          <ul className="grid gap-2">
            {session.documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
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
        )}
        <DocumentUpload sessionId={session.id} />
      </section>

      <section id="recordings" className="grid scroll-mt-6 gap-4">
        <h2 className="font-serif text-2xl">2. Recording</h2>
        <p className="text-sm text-ink-600">
          Paste the recorded live-session URL (Google Drive, Meet recording, or
          similar). Learners get a link on this section.
        </p>
        {session.recordings.length === 0 ? (
          <p className="rounded-lg border border-warn-border bg-warn-surface px-4 py-3 text-sm text-warn">
            No recording link yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {session.recordings.map((recording) => (
              <li
                key={recording.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
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
        )}
        <AddRecordingForm sessionId={session.id} />
      </section>

      <section id="quiz" className="grid scroll-mt-6 gap-6">
        <h2 className="font-serif text-2xl">3. Quiz</h2>
        <p className="text-sm text-ink-600">
          One quiz per section. Learners take it on the same page as the
          reading. Start from the template, or paste JSON.
        </p>
        {session.quizzes.map((quiz) => (
          <article key={quiz.id} className="rounded-xl border border-border bg-surface p-4">
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
        {session.quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4">
            <h3 className="mb-3 font-medium">Add a quiz</h3>
            <CreateQuizForm sessionId={session.id} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4">
            <h3 className="mb-3 font-medium">Add another quiz</h3>
            <CreateQuizForm sessionId={session.id} />
          </div>
        )}
      </section>
    </div>
  );
}

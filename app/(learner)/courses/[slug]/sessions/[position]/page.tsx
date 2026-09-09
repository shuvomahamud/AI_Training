import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { QuizRunner } from "@/components/quiz-runner";
import { LocalDate } from "@/components/local-time";
import { requireEnrollment } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/db/schema";
import { QuizSchema } from "@/lib/quiz/schema";

export const metadata = { title: "Section" };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ slug: string; position: string }>;
}) {
  const { slug, position } = await params;
  const positionNumber = Number(position);
  if (!Number.isInteger(positionNumber) || positionNumber < 1) notFound();

  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });
  if (!course) notFound();

  const user = await requireEnrollment(course.id);

  const session = await db.query.sessions.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.courseId, course.id), eq(table.position, positionNumber)),
    with: {
      documents: { orderBy: (table, { asc }) => [asc(table.position)] },
      quizzes: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: { currentVersion: true },
      },
    },
  });
  if (!session) notFound();

  const liveUrl = session.liveUrl || course.liveUrl;

  const quizIds = session.quizzes.map((quiz) => quiz.id);
  const attempts =
    quizIds.length === 0
      ? []
      : await db.query.quizAttempts.findMany({
          where: and(eq(quizAttempts.userId, user.id)),
          with: { version: true },
          orderBy: (table, { desc }) => [desc(table.submittedAt)],
        });

  const attemptsByQuiz = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    if (!quizIds.includes(attempt.version.quizId)) continue;
    const list = attemptsByQuiz.get(attempt.version.quizId) ?? [];
    list.push(attempt);
    attemptsByQuiz.set(attempt.version.quizId, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-ink-500">
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        {" · "}
        Section {session.position}
      </p>
      <h1 className="mt-2 font-serif text-4xl">{session.title}</h1>
      {session.summary ? (
        <p className="mt-3 text-ink-600">{session.summary}</p>
      ) : null}
      {session.scheduledAt ? (
        <p className="mt-2 text-sm text-ink-500">
          Scheduled <LocalDate iso={session.scheduledAt.toISOString()} />
        </p>
      ) : null}

      {liveUrl ? (
        <p className="mt-6">
          <a className="btn primary" href={liveUrl} target="_blank" rel="noreferrer">
            Join live session
          </a>
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Reading</h2>
        {session.documents.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">No reading in this section yet.</p>
        ) : (
          <div className="mt-4 grid gap-8">
            {session.documents.map((document) => (
              <article
                key={document.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-medium">{document.title}</h3>
                  <a
                    className="btn secondary !py-1.5"
                    href={`/api/documents/${document.id}/file?download=1`}
                  >
                    Download original
                  </a>
                </div>
                {document.sourceType === "pdf" || !document.htmlContent ? (
                  <iframe
                    className="mt-4 h-[70vh] w-full rounded-lg border border-border"
                    title={document.title}
                    src={`/api/documents/${document.id}/file`}
                  />
                ) : (
                  <div
                    className="prose-doc mt-4"
                    dangerouslySetInnerHTML={{ __html: document.htmlContent }}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-10">
        <h2 className="font-serif text-2xl">Quizzes</h2>
        {session.quizzes.length === 0 ? (
          <p className="text-sm text-ink-600">No quizzes in this section yet.</p>
        ) : (
          session.quizzes.map((quiz) => {
            if (!quiz.currentVersion) return null;
            const payload = QuizSchema.parse(quiz.currentVersion.json);
            const history = attemptsByQuiz.get(quiz.id) ?? [];
            return (
              <article
                key={quiz.id}
                className="rounded-2xl border border-border bg-paper-50 p-5"
              >
                <QuizRunner
                  quizId={quiz.id}
                  title={payload.title}
                  questions={payload.questions.map((question) => ({
                    id: question.id,
                    type: question.type,
                    prompt: question.prompt,
                    options: question.options,
                    safetyCritical: question.safetyCritical,
                  }))}
                />
                {history.length > 0 ? (
                  <div className="mt-6 border-t border-border pt-4">
                    <h4 className="text-sm font-semibold">Your attempts</h4>
                    <ul className="mt-2 text-sm text-ink-600">
                      {history.map((attempt) => (
                        <li key={attempt.id}>
                          Attempt {attempt.attemptNumber}: {attempt.score}/
                          {attempt.maxScore}
                          {attempt.passed ? " · passed" : " · not passed"}
                          {attempt.safetyCriticalPassed
                            ? " · safety-critical ok"
                            : " · safety-critical missed"}{" "}
                          · <LocalDate iso={attempt.submittedAt.toISOString()} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

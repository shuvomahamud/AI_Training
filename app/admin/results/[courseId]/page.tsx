import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsTable } from "@/components/results-table";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { QuizSchema } from "@/lib/quiz/schema";

export const metadata = { title: "Results" };

export default async function AdminResultsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdmin();
  const { courseId } = await params;
  const course = await db.query.courses.findFirst({
    where: (table, { eq }) => eq(table.id, courseId),
    with: {
      sessions: {
        with: {
          quizzes: {
            with: {
              versions: {
                with: {
                  attempts: { with: { user: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const attempts = course.sessions
    .flatMap((session) =>
      session.quizzes.flatMap((quiz) =>
        quiz.versions.flatMap((version) => {
          const payload = QuizSchema.parse(version.json);
          return version.attempts.map((attempt) => ({
            id: attempt.id,
            learner: attempt.user.name,
            email: attempt.user.email,
            quizTitle: quiz.title,
            versionNumber: version.versionNumber,
            score: attempt.score,
            maxScore: attempt.maxScore,
            passed: attempt.passed,
            safetyCriticalPassed: attempt.safetyCriticalPassed,
            submittedAt: attempt.submittedAt.toISOString(),
            answers: attempt.answersJson as Record<string, string[]>,
            questions: payload.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              options: question.options,
              correct: question.correct,
            })),
          }));
        }),
      ),
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  attempts.sort((a, b) => {
    const name = a.learner.localeCompare(b.learner);
    if (name !== 0) return name;
    return b.submittedAt.localeCompare(a.submittedAt);
  });

  return (
    <div>
      <p className="text-sm text-ink-500">
        <Link href={`/admin/courses/${course.id}`}>{course.title}</Link>
      </p>
      <h1 className="font-serif text-3xl">Quiz results</h1>
      <p className="mt-1 text-sm text-ink-600">
        Grouped by learner, newest attempts first. Expand a quiz title for
        per-question answers.
      </p>
      <div className="mt-6">
        <ResultsTable attempts={attempts} />
      </div>
    </div>
  );
}

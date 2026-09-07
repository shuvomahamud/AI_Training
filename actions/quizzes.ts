"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireEnrollment, requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  quizAttempts,
  quizVersions,
  quizzes,
  sessions,
} from "@/lib/db/schema";
import { gradeQuiz } from "@/lib/quiz/grade";
import { formatQuizIssues, QuizSchema, type QuizPayload } from "@/lib/quiz/schema";

export type QuizActionState =
  | { error: string; issues?: string[] }
  | { ok: true }
  | null;

async function nextQuizPosition(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${quizzes.position}), 0)` })
    .from(quizzes)
    .where(eq(quizzes.sessionId, sessionId));
  return Number(row?.max ?? 0) + 1;
}

function parseQuizJson(raw: string): { payload?: QuizPayload; issues?: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { issues: ["json: Invalid JSON"] };
  }
  const parsed = QuizSchema.safeParse(data);
  if (!parsed.success) {
    return { issues: formatQuizIssues(parsed.error) };
  }
  return { payload: parsed.data };
}

async function insertVersion(options: {
  quizId: string;
  payload: QuizPayload;
  userId: string;
  versionNumber: number;
}) {
  const [version] = await db
    .insert(quizVersions)
    .values({
      quizId: options.quizId,
      versionNumber: options.versionNumber,
      json: options.payload,
      createdBy: options.userId,
    })
    .returning();

  await db
    .update(quizzes)
    .set({
      currentVersionId: version.id,
      title: options.payload.title,
    })
    .where(eq(quizzes.id, options.quizId));

  return version;
}

export async function createQuizAction(
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const admin = await requireAdmin();
  const sessionId = z.string().uuid().safeParse(formData.get("sessionId"));
  if (!sessionId.success) return { error: "Invalid session." };

  const parsed = parseQuizJson(String(formData.get("json") ?? ""));
  if (!parsed.payload) {
    return { error: "Quiz JSON is invalid.", issues: parsed.issues };
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId.data),
    with: { course: true },
  });
  if (!session) return { error: "Session not found." };

  const [quiz] = await db
    .insert(quizzes)
    .values({
      sessionId: session.id,
      position: await nextQuizPosition(session.id),
      title: parsed.payload.title,
    })
    .returning();

  await insertVersion({
    quizId: quiz.id,
    payload: parsed.payload,
    userId: admin.id,
    versionNumber: 1,
  });

  revalidatePath(`/admin/sessions/${session.id}`);
  revalidatePath(`/courses/${session.course.slug}/sessions/${session.position}`);
  return { ok: true };
}

export async function updateQuizAction(
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const admin = await requireAdmin();
  const quizId = z.string().uuid().safeParse(formData.get("quizId"));
  if (!quizId.success) return { error: "Invalid quiz." };

  const parsed = parseQuizJson(String(formData.get("json") ?? ""));
  if (!parsed.payload) {
    return { error: "Quiz JSON is invalid.", issues: parsed.issues };
  }

  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId.data),
    with: { session: { with: { course: true } }, versions: true },
  });
  if (!quiz) return { error: "Quiz not found." };

  const nextVersion =
    quiz.versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) +
    1;

  await insertVersion({
    quizId: quiz.id,
    payload: parsed.payload,
    userId: admin.id,
    versionNumber: nextVersion,
  });

  revalidatePath(`/admin/sessions/${quiz.sessionId}`);
  revalidatePath(
    `/courses/${quiz.session.course.slug}/sessions/${quiz.session.position}`,
  );
  return { ok: true };
}

export async function deleteQuizAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, parsed.id),
  });
  if (!quiz) return;
  await db.delete(quizzes).where(eq(quizzes.id, quiz.id));
  revalidatePath(`/admin/sessions/${quiz.sessionId}`);
}

const answersSchema = z.record(z.string(), z.array(z.string()));

export type SubmitQuizResult =
  | {
      ok: true;
      score: number;
      maxScore: number;
      passed: boolean;
      safetyCriticalPassed: boolean;
      perQuestion: ReturnType<typeof gradeQuiz>["perQuestion"];
      attemptNumber: number;
    }
  | { error: string };

export async function submitQuizAction(input: {
  quizId: string;
  startedAt: string;
  answers: unknown;
}): Promise<SubmitQuizResult> {
  const user = await requireUser();
  const quizId = z.string().uuid().safeParse(input.quizId);
  if (!quizId.success) return { error: "Invalid quiz." };

  const answers = answersSchema.safeParse(input.answers);
  if (!answers.success) return { error: "Invalid answers." };

  const startedAt = new Date(input.startedAt);
  if (Number.isNaN(startedAt.getTime())) return { error: "Invalid start time." };

  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId.data),
    with: {
      currentVersion: true,
      session: { with: { course: true } },
    },
  });
  if (!quiz?.currentVersion) return { error: "Quiz not found." };

  await requireEnrollment(quiz.session.courseId);

  const payload = QuizSchema.parse(quiz.currentVersion.json);
  const result = gradeQuiz(payload, answers.data);

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(quizAttempts)
    .innerJoin(quizVersions, eq(quizAttempts.quizVersionId, quizVersions.id))
    .where(and(eq(quizVersions.quizId, quiz.id), eq(quizAttempts.userId, user.id)));

  const attemptNumber = Number(existingCount) + 1;

  await db.insert(quizAttempts).values({
    quizVersionId: quiz.currentVersion.id,
    userId: user.id,
    attemptNumber,
    score: result.score,
    maxScore: result.maxScore,
    passed: result.passed,
    safetyCriticalPassed: result.safetyCriticalPassed,
    answersJson: answers.data,
    startedAt,
  });

  revalidatePath("/me");
  revalidatePath(
    `/courses/${quiz.session.course.slug}/sessions/${quiz.session.position}`,
  );
  revalidatePath(`/admin/results/${quiz.session.courseId}`);
  revalidatePath("/admin");

  return { ok: true, attemptNumber, ...result };
}

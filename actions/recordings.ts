"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { courses, recordings } from "@/lib/db/schema";

export type ActionState = { error: string } | { ok: true } | null;

function revalidateRecordingPaths(slug: string, courseId: string) {
  revalidatePath("/admin/recordings");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/courses/${slug}/recordings`);
}

export async function addRecordingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      courseId: z.string().uuid(),
      label: z.string().min(1),
      url: z.string().url(),
      recordedAt: z.string().optional(),
    })
    .safeParse({
      courseId: formData.get("courseId"),
      label: formData.get("label"),
      url: formData.get("url"),
      recordedAt: formData.get("recordedAt") || undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, parsed.data.courseId),
  });
  if (!course) return { error: "Course not found." };

  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${recordings.position}), 0)` })
    .from(recordings)
    .where(eq(recordings.courseId, course.id));

  await db.insert(recordings).values({
    courseId: course.id,
    position: Number(row?.max ?? 0) + 1,
    label: parsed.data.label.trim(),
    url: parsed.data.url,
    recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : null,
  });

  revalidateRecordingPaths(course.slug, course.id);
  return { ok: true };
}

export async function deleteRecordingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, parsed.id),
    with: { course: true },
  });
  if (!recording) return;
  await db.delete(recordings).where(eq(recordings.id, parsed.id));
  revalidateRecordingPaths(recording.course.slug, recording.courseId);
}

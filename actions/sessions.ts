"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { deletePrivatePrefix } from "@/lib/storage";

export type ActionState = { error: string } | { ok: true } | null;

const sessionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  summary: z.string().optional(),
  moduleTitle: z.string().optional(),
  liveUrl: z.union([z.string().url(), z.literal("")]).optional(),
  scheduledAt: z.string().optional(),
});

function parseScheduledAt(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function nextPosition(courseId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${sessions.position}), 0)` })
    .from(sessions)
    .where(eq(sessions.courseId, courseId));
  return Number(row?.max ?? 0) + 1;
}

export async function createSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = sessionSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    moduleTitle: formData.get("moduleTitle") || undefined,
    liveUrl: formData.get("liveUrl") || "",
    scheduledAt: formData.get("scheduledAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const position = await nextPosition(parsed.data.courseId);
  const [session] = await db
    .insert(sessions)
    .values({
      courseId: parsed.data.courseId,
      position,
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      moduleTitle: parsed.data.moduleTitle?.trim() || null,
      liveUrl: parsed.data.liveUrl || null,
      scheduledAt: parseScheduledAt(parsed.data.scheduledAt),
    })
    .returning();

  revalidatePath(`/admin/courses/${parsed.data.courseId}`);
  redirect(`/admin/sessions/${session.id}`);
}

export async function updateSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = sessionSchema
    .omit({ courseId: true })
    .extend({ id: z.string().uuid() })
    .safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      summary: formData.get("summary") || undefined,
      moduleTitle: formData.get("moduleTitle") || undefined,
      liveUrl: formData.get("liveUrl") || "",
      scheduledAt: formData.get("scheduledAt") || undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [session] = await db
    .update(sessions)
    .set({
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      moduleTitle: parsed.data.moduleTitle?.trim() || null,
      liveUrl: parsed.data.liveUrl || null,
      scheduledAt: parseScheduledAt(parsed.data.scheduledAt),
    })
    .where(eq(sessions.id, parsed.data.id))
    .returning();

  revalidatePath(`/admin/sessions/${session.id}`);
  revalidatePath(`/admin/courses/${session.courseId}`);
  return { ok: true };
}

export async function moveSessionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      direction: z.enum(["up", "down"]),
    })
    .parse({
      id: formData.get("id"),
      direction: formData.get("direction"),
    });

  const current = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.id),
  });
  if (!current) return;

  const neighborPosition =
    parsed.direction === "up" ? current.position - 1 : current.position + 1;
  const neighbor = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.courseId, current.courseId),
      eq(sessions.position, neighborPosition),
    ),
  });
  if (!neighbor) return;

  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ position: 0 })
      .where(eq(sessions.id, current.id));
    await tx
      .update(sessions)
      .set({ position: current.position })
      .where(eq(sessions.id, neighbor.id));
    await tx
      .update(sessions)
      .set({ position: neighbor.position })
      .where(eq(sessions.id, current.id));
  });

  revalidatePath(`/admin/courses/${current.courseId}`);
}

export async function deleteSessionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.id),
    with: { course: true, documents: true },
  });
  if (!session) return;

  // Rows cascade, but stored originals and images do not. Remove them first so
  // deleting a section does not leave orphaned files behind.
  for (const document of session.documents) {
    await deletePrivatePrefix(`documents/${document.id}/`).catch(() => undefined);
  }

  await db.delete(sessions).where(eq(sessions.id, parsed.id));
  revalidatePath(`/admin/courses/${session.courseId}`);
  revalidatePath("/admin/recordings");
  revalidatePath(`/courses/${session.course.slug}`);
  revalidatePath(`/courses/${session.course.slug}/recordings`);
  redirect(`/admin/courses/${session.courseId}`);
}

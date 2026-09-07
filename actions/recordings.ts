"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { recordings, sessions } from "@/lib/db/schema";

export type ActionState = { error: string } | { ok: true } | null;

export async function addRecordingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      label: z.string().min(1),
      url: z.string().url(),
      recordedAt: z.string().optional(),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      label: formData.get("label"),
      url: formData.get("url"),
      recordedAt: formData.get("recordedAt") || undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.data.sessionId),
  });
  if (!session) return { error: "Session not found." };

  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${recordings.position}), 0)` })
    .from(recordings)
    .where(eq(recordings.sessionId, session.id));

  await db.insert(recordings).values({
    sessionId: session.id,
    position: Number(row?.max ?? 0) + 1,
    label: parsed.data.label.trim(),
    url: parsed.data.url,
    recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : null,
  });

  revalidatePath(`/admin/sessions/${session.id}`);
  return { ok: true };
}

export async function deleteRecordingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, parsed.id),
  });
  if (!recording) return;
  await db.delete(recordings).where(eq(recordings.id, parsed.id));
  revalidatePath(`/admin/sessions/${recording.sessionId}`);
}

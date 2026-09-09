"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { documents, sessions } from "@/lib/db/schema";
import { convertDocument } from "@/lib/documents/convert";
import { deletePrivateObject, deletePrivatePrefix, putPrivateObject } from "@/lib/storage";

export type ActionState = { error: string } | { ok: true } | null;

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).parse({
    id: formData.get("id"),
  });

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, parsed.id),
    with: { session: { with: { course: true } } },
  });
  if (!document) return;

  await deletePrivateObject(document.blobPathname).catch(() => undefined);
  await deletePrivatePrefix(`documents/${document.id}/`).catch(() => undefined);

  await db.delete(documents).where(eq(documents.id, document.id));

  revalidatePath(`/admin/sessions/${document.sessionId}`);
  revalidatePath(
    `/courses/${document.session.course.slug}/sessions/${document.session.position}`,
  );
}

export async function updateDocumentTitleAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
    })
    .parse({
      id: formData.get("id"),
      title: formData.get("title"),
    });

  const [document] = await db
    .update(documents)
    .set({ title: parsed.title.trim() })
    .where(eq(documents.id, parsed.id))
    .returning();

  if (document) {
    revalidatePath(`/admin/sessions/${document.sessionId}`);
  }
}

export async function saveMarkdownMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      title: z.string().trim().min(1, "Title is required").max(200),
      markdown: z.string().trim().min(1, "Write or paste the reading first."),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      title: formData.get("title"),
      markdown: formData.get("markdown"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.data.sessionId),
    with: { course: true },
  });
  if (!session) return { error: "Section not found." };

  const documentId = crypto.randomUUID();
  const bytes = Buffer.from(parsed.data.markdown, "utf8");
  const filename = `${parsed.data.title}.md`;

  try {
    const stored = await putPrivateObject(
      `documents/${documentId}/source-${crypto.randomUUID()}.md`,
      bytes,
      "text/plain; charset=utf-8",
    );
    const converted = await convertDocument({
      documentId,
      filename,
      bytes,
    });
    const [position] = await db
      .select({ max: sql<number>`coalesce(max(${documents.position}), 0)` })
      .from(documents)
      .where(eq(documents.sessionId, session.id));

    await db.insert(documents).values({
      id: documentId,
      sessionId: session.id,
      position: Number(position?.max ?? 0) + 1,
      title: parsed.data.title,
      sourceType: converted.sourceType,
      originalFilename: filename.slice(0, 255),
      blobUrl: stored.url,
      blobPathname: stored.pathname,
      mime: "text/plain; charset=utf-8",
      sizeBytes: bytes.length,
      htmlContent: converted.html,
    });
  } catch (error) {
    await deletePrivatePrefix(`documents/${documentId}/`).catch(() => undefined);
    console.error("Markdown material save failed", error);
    return { error: "Could not save the reading." };
  }

  revalidatePath(`/admin/sessions/${session.id}`);
  revalidatePath(`/courses/${session.course.slug}/sessions/${session.position}`);
  return { ok: true };
}

"use server";

import { del, get, list } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { documents, sessions } from "@/lib/db/schema";
import {
  convertDocument,
  UnsupportedDocumentError,
} from "@/lib/documents/convert";

export type AttachState = { error: string } | { ok: true } | null;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const attachSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1),
  filename: z.string().min(1),
  blobUrl: z.string().url(),
  pathname: z.string().min(1),
});

function verifiedBlobUrl(blobUrl: string, pathname: string): URL | null {
  let url: URL;
  try {
    url = new URL(blobUrl);
  } catch {
    return null;
  }

  let expectedPathname: string;
  try {
    expectedPathname = decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
  const isVercelBlob = url.hostname.endsWith(
    ".private.blob.vercel-storage.com",
  );

  if (
    url.protocol !== "https:" ||
    !isVercelBlob ||
    url.port ||
    url.username ||
    url.password ||
    expectedPathname !== pathname
  ) {
    return null;
  }

  return url;
}

async function readWithLimit(
  stream: ReadableStream<Uint8Array>,
  declaredSize: number,
): Promise<Buffer | null> {
  if (declaredSize > MAX_DOCUMENT_BYTES) {
    return null;
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, size);
}

async function nextDocumentPosition(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${documents.position}), 0)` })
    .from(documents)
    .where(eq(documents.sessionId, sessionId));
  return Number(row?.max ?? 0) + 1;
}

export async function attachDocumentAction(
  input: unknown,
): Promise<AttachState> {
  await requireAdmin();
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid upload." };
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.data.sessionId),
    with: { course: true },
  });
  if (!session) return { error: "Session not found." };

  const blobUrl = verifiedBlobUrl(parsed.data.blobUrl, parsed.data.pathname);
  if (!blobUrl) return { error: "Invalid uploaded file URL." };

  const blob = await get(blobUrl.toString(), { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return { error: "Could not read the uploaded file." };
  }

  const bytes = await readWithLimit(blob.stream, blob.blob.size);
  if (!bytes) return { error: "The uploaded file is too large or unreadable." };
  const documentId = crypto.randomUUID();

  let converted;
  try {
    converted = await convertDocument({
      documentId,
      filename: parsed.data.filename,
      bytes,
    });
  } catch (error) {
    if (error instanceof UnsupportedDocumentError) {
      return { error: error.message };
    }
    throw error;
  }

  await db.insert(documents).values({
    id: documentId,
    sessionId: session.id,
    position: await nextDocumentPosition(session.id),
    title: parsed.data.title.trim(),
    sourceType: converted.sourceType,
    originalFilename: parsed.data.filename,
    blobUrl: blobUrl.toString(),
    blobPathname: parsed.data.pathname,
    mime: blob.blob.contentType || "application/octet-stream",
    sizeBytes: bytes.length,
    htmlContent: converted.html,
  });

  revalidatePath(`/admin/sessions/${session.id}`);
  revalidatePath(`/courses/${session.course.slug}/sessions/${session.position}`);
  return { ok: true };
}

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

  await del(document.blobPathname).catch(() => undefined);
  const images = await list({ prefix: `documents/${document.id}/` });
  if (images.blobs.length > 0) {
    await del(images.blobs.map((blob) => blob.url)).catch(() => undefined);
  }

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

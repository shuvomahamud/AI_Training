import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { documents, sessions } from "@/lib/db/schema";
import {
  convertDocument,
  sourceTypeFor,
  UnsupportedDocumentError,
} from "@/lib/documents/convert";
import { deletePrivatePrefix, putPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const inputSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

const canonicalMime = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/plain; charset=utf-8",
  pdf: "application/pdf",
} as const;

function safeExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  const extension = index === -1 ? "" : filename.slice(index).toLowerCase();
  return /^[.][a-z0-9]{1,10}$/.test(extension) ? extension : ".bin";
}

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const parsed = inputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    title: formData.get("title"),
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
    return Response.json(
      { error: "File must be between 1 byte and 25 MB." },
      { status: 400 },
    );
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, parsed.data.sessionId),
    with: { course: true },
  });
  if (!session) {
    return Response.json({ error: "Section not found." }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const documentId = crypto.randomUUID();
  try {
    const sourceType = sourceTypeFor(file.name);
    if (sourceType === "pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return Response.json({ error: "The uploaded PDF is invalid." }, { status: 400 });
    }
    if (sourceType === "docx" && !bytes.subarray(0, 2).equals(Buffer.from("PK"))) {
      return Response.json({ error: "The uploaded DOCX is invalid." }, { status: 400 });
    }

    const pathname = `documents/${documentId}/source-${crypto.randomUUID()}${safeExtension(file.name)}`;
    const stored = await putPrivateObject(
      pathname,
      bytes,
      canonicalMime[sourceType],
    );
    const converted = await convertDocument({ documentId, filename: file.name, bytes });
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
      originalFilename: file.name.slice(0, 255),
      blobUrl: stored.url,
      blobPathname: stored.pathname,
      mime: canonicalMime[sourceType],
      sizeBytes: bytes.length,
      htmlContent: converted.html,
    });

    revalidatePath(`/admin/sessions/${session.id}`);
    revalidatePath(`/courses/${session.course.slug}/sessions/${session.position}`);
    return Response.json({ ok: true });
  } catch (error) {
    await deletePrivatePrefix(`documents/${documentId}/`).catch(() => undefined);
    if (error instanceof UnsupportedDocumentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Document upload failed", error);
    return Response.json({ error: "Document upload failed." }, { status: 500 });
  }
}

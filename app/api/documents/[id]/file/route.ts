import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireEnrollment } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { session: true },
  });
  if (!document) notFound();

  await requireEnrollment(document.session.courseId);

  const stored = await getPrivateObject(document.blobPathname, document.mime);
  if (!stored) notFound();

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = document.originalFilename.replace(/"/g, "");

  return new Response(stored.body, {
    headers: {
      "Content-Type": document.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}

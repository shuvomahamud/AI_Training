import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireEnrollment } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

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

  const upstream = await get(document.blobPathname, { access: "private" });
  if (!upstream || upstream.statusCode !== 200) notFound();

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = document.originalFilename.replace(/"/g, "");

  return new Response(upstream.stream, {
    headers: {
      "Content-Type": document.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

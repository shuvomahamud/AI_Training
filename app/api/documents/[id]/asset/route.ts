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

  const pathname = new URL(request.url).searchParams.get("pathname");
  if (!pathname || !pathname.startsWith(`documents/${document.id}/`)) {
    notFound();
  }

  const asset = await get(pathname, { access: "private" });
  if (!asset || asset.statusCode !== 200) notFound();

  return new Response(asset.stream, {
    headers: {
      "Content-Type": asset.blob.contentType,
      "Content-Length": String(asset.blob.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

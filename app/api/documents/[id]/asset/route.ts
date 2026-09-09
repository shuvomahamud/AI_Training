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

  const pathname = new URL(request.url).searchParams.get("pathname");
  if (!pathname || !pathname.startsWith(`documents/${document.id}/`)) {
    notFound();
  }

  const contentType = pathname.endsWith(".png")
    ? "image/png"
    : pathname.endsWith(".jpg")
      ? "image/jpeg"
      : pathname.endsWith(".gif")
        ? "image/gif"
        : pathname.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";
  const asset = await getPrivateObject(pathname, contentType);
  if (!asset) notFound();

  return new Response(asset.body, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

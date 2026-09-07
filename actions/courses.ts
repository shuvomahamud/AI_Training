"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().optional(),
  liveUrl: z.union([z.string().url(), z.literal("")]).optional(),
  slug: z.string().optional(),
});

export type ActionState = { error: string } | { ok: true } | null;

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  let candidate = slugify(base);
  let n = 2;
  while (true) {
    const existing = await db.query.courses.findFirst({
      where: eq(courses.slug, candidate),
    });
    if (!existing || existing.id === exceptId) return candidate;
    candidate = `${slugify(base)}-${n++}`;
  }
}

export async function createCourseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    liveUrl: formData.get("liveUrl") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const slug = await uniqueSlug(parsed.data.title);
  const [course] = await db
    .insert(courses)
    .values({
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      liveUrl: parsed.data.liveUrl || null,
      slug,
      status: "draft",
    })
    .returning();

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = courseSchema.extend({ id: z.string().uuid() }).safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    liveUrl: formData.get("liveUrl") || "",
    slug: formData.get("slug") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const slug = parsed.data.slug
    ? await uniqueSlug(parsed.data.slug, parsed.data.id)
    : undefined;

  await db
    .update(courses)
    .set({
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      liveUrl: parsed.data.liveUrl || null,
      ...(slug ? { slug } : {}),
    })
    .where(eq(courses.id, parsed.data.id));

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${parsed.data.id}`);
  revalidatePath("/courses");
  return { ok: true };
}

export async function setCourseStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["draft", "published"]),
    })
    .parse({
      id: formData.get("id"),
      status: formData.get("status"),
    });

  await db
    .update(courses)
    .set({ status: parsed.status })
    .where(eq(courses.id, parsed.id));

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${parsed.id}`);
  revalidatePath("/courses");
}

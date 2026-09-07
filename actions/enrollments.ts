"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";

export type ActionState = { error: string } | { ok: true } | null;

export async function requestEnrollmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.role === "admin") {
    return { error: "Admins already have access to every course." };
  }

  const parsed = z.object({ courseId: z.string().uuid() }).safeParse({
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) return { error: "Invalid course." };

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, parsed.data.courseId),
  });
  if (!course || course.status !== "published") {
    return { error: "That course is not available." };
  }

  const existing = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.courseId, course.id),
      eq(enrollments.userId, user.id),
    ),
  });

  if (existing?.status === "approved") {
    return { ok: true };
  }
  if (existing?.status === "pending") {
    return { error: "Your request is already pending." };
  }

  if (existing?.status === "rejected") {
    await db
      .update(enrollments)
      .set({
        status: "pending",
        requestedAt: new Date(),
        decidedAt: null,
        decidedBy: null,
      })
      .where(eq(enrollments.id, existing.id));
  } else {
    await db.insert(enrollments).values({
      courseId: course.id,
      userId: user.id,
      status: "pending",
    });
  }

  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin");
  return { ok: true };
}

export async function decideEnrollmentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
    })
    .parse({
      id: formData.get("id"),
      decision: formData.get("decision"),
    });

  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, parsed.id),
    with: { course: true },
  });
  if (!enrollment) return;

  await db
    .update(enrollments)
    .set({
      status: parsed.decision,
      decidedAt: new Date(),
      decidedBy: admin.id,
    })
    .where(eq(enrollments.id, parsed.id));

  revalidatePath("/admin/enrollments");
  revalidatePath("/admin");
  revalidatePath("/courses");
  revalidatePath(`/courses/${enrollment.course.slug}`);
}

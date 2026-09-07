"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type ActionState = { error: string } | { ok: true } | null;

export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "learner"]),
    })
    .safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return { error: "Invalid input." };

  if (parsed.data.userId === admin.id && parsed.data.role !== "admin") {
    return { error: "You cannot remove your own admin role." };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.userId),
  });
  if (!target) return { error: "User not found." };
  if (target.role === parsed.data.role) return { ok: true };

  await db
    .update(users)
    .set({
      role: parsed.data.role,
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, parsed.data.userId));

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      userId: z.string().uuid(),
      password: z
        .string()
        .min(12, "Password must be at least 12 characters")
        .max(128, "Password must be at most 128 characters"),
    })
    .safeParse({
      userId: formData.get("userId"),
      password: formData.get("password"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.password),
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, parsed.data.userId));

  revalidatePath("/admin/users");
  return { ok: true };
}

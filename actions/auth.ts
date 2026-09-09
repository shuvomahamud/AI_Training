"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearRateLimit,
  consumeRateLimit,
} from "@/lib/auth/rate-limit";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeEmail } from "@/lib/utils";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().min(1, "Name is required").max(100),
  next: z.string().optional(),
});

export type AuthState = { error: string } | null;

function safeNext(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = normalizeEmail(parsed.data.email);
  if (!consumeRateLimit(`signup:${email}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many attempts. Please try again later." };
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "learner",
    })
    .returning();

  await setSessionCookie({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  });

  redirect(safeNext(parsed.data.next) ?? "/courses");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.omit({ name: true }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = normalizeEmail(parsed.data.email);
  const rateLimitKey = `login:${email}`;
  if (!consumeRateLimit(rateLimitKey, 10, 15 * 60 * 1000)) {
    return { error: "Too many attempts. Please try again later." };
  }
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  clearRateLimit(rateLimitKey);

  await setSessionCookie({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  });

  const dest =
    safeNext(parsed.data.next) ?? (user.role === "admin" ? "/admin" : "/courses");
  redirect(dest);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

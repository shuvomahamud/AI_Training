import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";
import { getSession, type SessionUser } from "./session";

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

export async function requireEnrollment(courseId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "admin") return user;

  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.courseId, courseId),
      eq(enrollments.userId, user.id),
      eq(enrollments.status, "approved"),
    ),
  });

  if (!enrollment) notFound();
  return user;
}

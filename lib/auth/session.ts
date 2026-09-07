import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  signSession,
  verifySession,
  SESSION_COOKIE,
  type SessionUser,
} from "./jwt";

export { signSession, verifySession, SESSION_COOKIE, type SessionUser };
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
  });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  };
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    priority: "high",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
}

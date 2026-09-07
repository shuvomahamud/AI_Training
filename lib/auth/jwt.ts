import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ai-course-session" : "session";

export type UserRole = "admin" | "learner";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  sessionVersion: number;
};

type SessionClaims = JWTPayload & {
  email: string;
  role: string;
  name: string;
  sessionVersion: number;
};

const SESSION_ISSUER = "ai-course-website";
const SESSION_AUDIENCE = "ai-course-website";

export function getJwtSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw) {
    throw new Error("SESSION_SECRET is not set");
  }

  let decoded: Uint8Array;
  try {
    const binary = atob(raw.trim().replace(/-/g, "+").replace(/_/g, "/"));
    decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("SESSION_SECRET must be valid base64");
  }
  if (decoded.length < 32) {
    throw new Error("SESSION_SECRET must decode to at least 32 bytes");
  }
  return decoded;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionClaims>(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (
      !payload.sub ||
      !payload.email ||
      (payload.role !== "admin" && payload.role !== "learner") ||
      !payload.name ||
      !Number.isInteger(payload.sessionVersion)
    ) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    return null;
  }
}

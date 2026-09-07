import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { normalizeEmail } from "../lib/utils";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
}
if (password.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters");
}
if (password.length > 128) {
  throw new Error("ADMIN_PASSWORD must be at most 128 characters");
}

const normalized = normalizeEmail(email);
const existing = await db.query.users.findFirst({
  where: eq(users.email, normalized),
});

if (existing) {
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      role: "admin",
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, existing.id));
  console.log(`Updated admin user ${normalized}`);
} else {
  await db.insert(users).values({
    email: normalized,
    name: "Admin",
    passwordHash: await hashPassword(password),
    role: "admin",
  });
  console.log(`Created admin user ${normalized}`);
}

process.exit(0);

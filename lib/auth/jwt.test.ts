import { afterAll, beforeAll, expect, test } from "bun:test";
import { signSession, verifySession } from "./jwt";

const previousSecret = process.env.SESSION_SECRET;

beforeAll(() => {
  process.env.SESSION_SECRET = Buffer.alloc(32, 7).toString("base64");
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = previousSecret;
});

test("round-trips a versioned session", async () => {
  const user = {
    id: crypto.randomUUID(),
    email: "learner@example.com",
    role: "learner" as const,
    name: "Learner",
    sessionVersion: 3,
  };

  const token = await signSession(user);
  expect(await verifySession(token)).toEqual(user);
});

test("rejects a modified token", async () => {
  const token = await signSession({
    id: crypto.randomUUID(),
    email: "admin@example.com",
    role: "admin",
    name: "Admin",
    sessionVersion: 0,
  });
  const modified = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  expect(await verifySession(modified)).toBeNull();
});

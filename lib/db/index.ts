import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  db: Database | undefined;
};

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const caBase64 = process.env.DATABASE_CA_CERT_BASE64;
  const tlsServerName = process.env.DATABASE_TLS_SERVERNAME;
  const sslDisabled = new URL(url).searchParams.get("sslmode") === "disable";

  if (sslDisabled && process.env.NODE_ENV === "production") {
    throw new Error("Database TLS cannot be disabled in production");
  }

  if (!sslDisabled && (!caBase64 || !tlsServerName)) {
    throw new Error(
      "DATABASE_CA_CERT_BASE64 and DATABASE_TLS_SERVERNAME are required for verified TLS",
    );
  }

  const client = postgres(url, {
    prepare: false,
    max: 1,
    ssl: sslDisabled
      ? false
      : {
          ca: Buffer.from(caBase64!, "base64").toString("utf8"),
          rejectUnauthorized: true,
          servername: tlsServerName,
          minVersion: "TLSv1.2",
        },
  });

  return drizzle(client, { schema });
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    if (!globalForDb.db) {
      globalForDb.db = createDb();
    }
    const value = Reflect.get(globalForDb.db, property, globalForDb.db);
    return typeof value === "function" ? value.bind(globalForDb.db) : value;
  },
});

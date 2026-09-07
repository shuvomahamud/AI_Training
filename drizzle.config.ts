import { defineConfig } from "drizzle-kit";

const caBase64 = process.env.DATABASE_CA_CERT_BASE64;
const tlsServerName = process.env.DATABASE_TLS_SERVERNAME;
const url = process.env.DIRECT_DATABASE_URL;
const parsedUrl = url ? new URL(url) : null;

const sslDisabled = parsedUrl?.searchParams.get("sslmode") === "disable";

if (url && !sslDisabled && (!caBase64 || !tlsServerName)) {
  throw new Error(
    "DATABASE_CA_CERT_BASE64 and DATABASE_TLS_SERVERNAME are required for verified TLS",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url
    ? {
        dbCredentials: {
          host: parsedUrl!.hostname,
          port: parsedUrl!.port ? Number(parsedUrl!.port) : 5432,
          user: decodeURIComponent(parsedUrl!.username),
          password: decodeURIComponent(parsedUrl!.password),
          database: decodeURIComponent(parsedUrl!.pathname.slice(1)),
          ssl: sslDisabled
            ? false
            : {
                ca: Buffer.from(caBase64!, "base64").toString("utf8"),
                rejectUnauthorized: true,
                servername: tlsServerName,
                minVersion: "TLSv1.2",
              },
        },
      }
    : {}),
});

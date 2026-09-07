# Secure production deployment

## Current database state

- PostgreSQL 16 listens only on loopback and the VPS Tailscale address.
- PgBouncer listens only on loopback and the VPS Tailscale address.
- The IONOS public interface has no PostgreSQL or PgBouncer listener or firewall rule.
- Port 5432 is for migrations from the administrator Mac over Tailscale only.
- Port 6432 is the transaction-pooled application endpoint.
- Database TLS is signed by the private project CA and verified as `tonu-vps`.
- The application and migration roles are separate. The application role cannot create schema objects.

Do not expose PostgreSQL port 5432 to the internet.

## Required Vercel networking

Do not connect a Hobby deployment directly to this database. Default Vercel Function egress addresses are dynamic, so a safe IP allowlist is not possible.

Use one of:

1. Vercel Pro with Static IPs enabled for the `cle1` Function region.
2. Vercel Enterprise Secure Compute for dedicated networking.

After Vercel assigns the egress IP pair:

1. Add only those exact `/32` addresses to the IONOS Cloud Firewall for TCP 6432.
2. Add the same exact sources to UFW and PgBouncer's HBA file.
3. Bind PgBouncer (not PostgreSQL) to `74.208.169.77:6432`.
4. Keep TCP 5432 private to Tailscale.
5. Test the deployed application, then verify ports 22 and 5432 remain filtered publicly.

Static IP allowlisting is one layer. TLS certificate verification and the random application-role password remain required.

## Production environment variables

Set these as encrypted Vercel environment variables. Never prefix them with `NEXT_PUBLIC_`.

- `DATABASE_URL`: the `ai_course_app` URL using public IP `74.208.169.77`, port 6432, and database `ai_course`.
- `DATABASE_CA_CERT_BASE64`: the project database CA certificate encoded as one base64 line.
- `DATABASE_TLS_SERVERNAME`: `tonu-vps`.
- `SESSION_SECRET`: a new random value used only by this production app.
- `BLOB_READ_WRITE_TOKEN`: connect a **private** Vercel Blob store.

Do not add `DIRECT_DATABASE_URL` or the migration-role password to Vercel. Run migrations from the administrator Mac through Tailscale instead.

## Vercel controls to enable

- Protect preview deployments with Vercel Authentication.
- Add WAF rate limits for POST requests to `/login` and `/signup` (start by logging, then enforce a 429 response).
- Keep Node.js Functions in `cle1`, close to the IONOS Lenexa host.
- Enable alerts for function errors, unusual traffic, and firewall events.

## Blob storage

Create a private Blob store. Originals and converted images are uploaded as private objects. Learners receive content only through authenticated application routes that re-check course enrollment.

## Backups

pgBackRest takes an encrypted differential backup Monday through Saturday and an encrypted full backup Sunday. Two full backup sets are retained. The current repository is on the VPS, so configure a second off-server repository before treating disaster recovery as complete.

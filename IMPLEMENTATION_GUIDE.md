# AI Course Website — Implementation Guide

Build spec for an internal training portal. Hand this to the implementing agent and follow it in order.

Companion document: `COURSE_PLAN.md` is the course-design source. Note that it still
describes an **eight-session** structure; the course being built here is **six sessions
covering ten topics** (§1). Where the two disagree, this file wins for software
structure. `COURSE_PLAN.md` needs updating separately.

---

## 1. What it does

An admin uploads course material. Learners sign up, an admin approves them, and approved learners read the documents, join the live sessions, watch recordings, and take quizzes. Quiz results are stored for admin review.

**Admin can:** create a course → create ten topics inside it → upload documents to a topic → add a quiz (JSON) to a topic → set the course live link and add recording links → approve or reject enrollment requests → review quiz results.

**Learner can:** sign up → request access to a course → once approved, read documents in the browser, download originals, open live and recording links, take quizzes repeatedly, and see their own attempt history.

### Topics are the structure. Sessions are not.

**A topic is the only content unit.** It has its own document and its own quiz, and it is what an admin uploads to. There are ten, ordered 1–10.

**There is no session entity.** Live sessions happen on Google Meet and are not modelled. A course has one standing live link, and one flat list of recording links displayed on a single page. A recording is a label and a URL — nothing more. It owns no documents, no quizzes, and no topics.

So the whole content model is: **course → ten topics → documents + one quiz per topic**, plus a course-level live link and a course-level list of recordings.

Do not build session pages, session records, or any topic-to-session relationship. The six live sessions each cover one or two topics, but that grouping is delivery information for the facilitator and belongs in a recording's label, not in the schema:

| Recording label | Covers |
|---|---|
| Session 1 — What AI is + Types of AI | Topics 01, 02 |
| Session 2 — How language models work + Prompting | Topics 03, 04 |
| Session 3 — Accuracy, hallucinations, verification | Topic 06 |
| Session 4 — Data protection and responsible use | Topic 07 |
| Session 5 — Business use cases + Workflow opportunities | Topics 05, 08 |
| Session 6 — Customer discovery + Explaining Talent Genie | Topics 09, 10 |

The schema supports many courses; only one exists at launch.

---

## 2. Stack — fixed decisions

| Concern | Choice | Notes |
|---|---|---|
| App | Next.js 15, App Router, TypeScript | Deployed on Vercel, Node runtime |
| Database | PostgreSQL 16 on a self-hosted VPS | Public port, TLS, behind PgBouncer |
| DB driver | `postgres` (postgres.js) + Drizzle ORM | See §5 for required pooling flags |
| File storage | Vercel Blob | Client-direct uploads |
| Auth | `jose` JWT in an httpOnly cookie + `bcryptjs` | Hand-rolled, no NextAuth |
| Doc conversion | `mammoth`, `markdown-it`, `sanitize-html` | Server-side, at upload time |
| Validation | `zod` | Quiz JSON and all form input |
| Styling | Tailwind CSS | |
| Package manager | Bun (`bun install`, `bun test`) | Runtime on Vercel is Node |

**Do not substitute.** Notably: no Prisma, no NextAuth, no `pg`, no S3. These were chosen against alternatives.

> The repo's root `CLAUDE.md` prescribes Bun APIs (`Bun.serve`, `bun:sqlite`, `Bun.sql`). Those do not apply here — Vercel has no Bun function runtime. Bun remains the package manager and test runner only.

### Dependencies

```
next react react-dom
drizzle-orm postgres
drizzle-kit @types/pg          # dev
jose bcryptjs @types/bcryptjs
@vercel/blob
mammoth markdown-it sanitize-html
@types/markdown-it @types/sanitize-html   # dev
zod
tailwindcss @tailwindcss/typography
```

### Environment variables

```bash
DATABASE_URL=            # via PgBouncer, port 6432, transaction mode — used by the app
DIRECT_DATABASE_URL=     # direct Postgres, port 5432, session mode — used by migrations ONLY
DATABASE_CA_CERT_BASE64= # private database CA certificate, one base64 line
DATABASE_TLS_SERVERNAME= # certificate name (tonu-vps)
SESSION_SECRET=          # 32+ random bytes, base64
BLOB_READ_WRITE_TOKEN=   # provided by the Vercel Blob integration
ADMIN_EMAIL=             # consumed by the seed script
ADMIN_PASSWORD=          # consumed by the seed script
```

Both database clients must use the CA and server name above with certificate
verification enabled. Do not put `sslmode` in the URLs; Drizzle Kit's URL-only
connection path can discard the custom CA options.

---

## 3. Directory layout

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (learner)/courses/page.tsx
  (learner)/courses/[slug]/page.tsx
  (learner)/courses/[slug]/recordings/page.tsx
  (learner)/courses/[slug]/topics/[position]/page.tsx
  (learner)/me/page.tsx
  admin/page.tsx
  admin/courses/page.tsx
  admin/courses/[id]/page.tsx
  admin/topics/[id]/page.tsx
  admin/enrollments/page.tsx
  admin/results/[courseId]/page.tsx
  admin/users/page.tsx
  api/upload/route.ts                    # Blob client-upload token issuer
  api/documents/[id]/file/route.ts       # gated file streaming
  api/documents/[id]/assets/[assetId]/route.ts   # gated docx image streaming
  layout.tsx
lib/
  db/index.ts          # drizzle client
  db/schema.ts
  auth/session.ts      # JWT sign/verify, cookie helpers
  auth/password.ts     # bcryptjs wrappers
  auth/guards.ts       # requireUser, requireAdmin, requireEnrollment
  documents/convert.ts # docx/md → sanitized HTML
  documents/sanitize.ts
  quiz/schema.ts       # zod schema for quiz JSON
  quiz/grade.ts
actions/               # server actions, one file per domain
middleware.ts
drizzle/               # generated migrations
scripts/seed-admin.ts
drizzle.config.ts
vercel.json
```

---

## 4. Database schema

Drizzle, in `lib/db/schema.ts`. All timestamps `timestamptz`, stored UTC, formatted in the client.

```
users
  id            uuid pk default gen_random_uuid()
  email         text unique not null            -- store lowercased
  password_hash text not null
  name          text not null
  role          text not null default 'learner' -- 'admin' | 'learner'
  created_at    timestamptz not null default now()

courses
  id          uuid pk
  slug        text unique not null
  title       text not null
  summary     text
  status      text not null default 'draft'     -- 'draft' | 'published'
  live_url    text                              -- standing course-wide meeting link
  created_at  timestamptz not null default now()

enrollments
  id            uuid pk
  course_id     uuid not null references courses on delete cascade
  user_id       uuid not null references users on delete cascade
  status        text not null default 'pending' -- 'pending' | 'approved' | 'rejected'
  requested_at  timestamptz not null default now()
  decided_at    timestamptz
  decided_by    uuid references users
  unique (course_id, user_id)

topics                                          -- the only content unit: documents + one quiz
  id          uuid pk
  course_id   uuid not null references courses on delete cascade
  position    integer not null                  -- 1..10, ordering within the course
  title       text not null
  summary     text
  created_at  timestamptz not null default now()
  unique (course_id, position)

documents
  id                uuid pk
  topic_id          uuid not null references topics on delete cascade
  position          integer not null
  title             text not null
  source_type       text not null               -- 'docx' | 'md' | 'pdf'
  original_filename text not null
  blob_url          text not null               -- NEVER sent to the client
  blob_pathname     text not null               -- needed for deletion
  mime              text not null
  size_bytes        integer not null
  html_content      text                        -- null for pdf
  created_at        timestamptz not null default now()

document_assets                                 -- images extracted from a docx
  id            uuid pk
  document_id   uuid not null references documents on delete cascade
  blob_pathname text not null                   -- private blob, never sent to the client
  mime          text not null
  created_at    timestamptz not null default now()

quizzes
  id                 uuid pk
  topic_id           uuid not null references topics on delete cascade
  position           integer not null
  title              text not null
  current_version_id uuid references quiz_versions   -- nullable to break the circular FK
  created_at         timestamptz not null default now()

quiz_versions
  id             uuid pk
  quiz_id        uuid not null references quizzes on delete cascade
  version_number integer not null
  json           jsonb not null                 -- validated payload, see §9
  created_at     timestamptz not null default now()
  created_by     uuid references users
  unique (quiz_id, version_number)

quiz_attempts
  id                     uuid pk
  quiz_version_id        uuid not null references quiz_versions
  user_id                uuid not null references users on delete cascade
  attempt_number         integer not null       -- per (user, quiz), not per version
  score                  integer not null
  max_score              integer not null
  passed                 boolean not null
  safety_critical_passed boolean not null
  answers_json           jsonb not null
  started_at             timestamptz not null
  submitted_at           timestamptz not null default now()

recordings                                      -- a flat list of links, no structure
  id           uuid pk
  course_id    uuid not null references courses on delete cascade
  position     integer not null
  label        text not null                    -- e.g. "Session 3 — Accuracy and verification"
  url          text not null
  recorded_at  timestamptz
```

**Why attempts point at `quiz_versions`:** editing a quiz inserts a new version row and repoints `quizzes.current_version_id`. Learners are always served the current version; historical attempts stay accurate against the questions actually asked. Never mutate a `quiz_versions.json` in place.

There is no `sessions` table and no link between recordings and topics. If a reason to relate them appears later, add it then — it is not needed to ship.

Add indexes on every foreign key used for lookup: `enrollments(user_id)`, `enrollments(course_id, status)`, `topics(course_id, position)`, `recordings(course_id, position)`, `documents(topic_id)`, `document_assets(document_id)`, `quizzes(topic_id)`, `quiz_attempts(user_id)`, `quiz_attempts(quiz_version_id)`.

---

## 5. Database connection — four things that will break if ignored

```ts
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,   // REQUIRED: PgBouncer transaction mode cannot hold prepared statements
  max: 1,           // PgBouncer pools; each serverless instance needs only one
  ssl: {
    ca: Buffer.from(process.env.DATABASE_CA_CERT_BASE64!, 'base64').toString('utf8'),
    servername: process.env.DATABASE_TLS_SERVERNAME!,
    rejectUnauthorized: true,
  },
});

export const db = drizzle(client, { schema });
```

1. **`prepare: false` is mandatory.** Without it queries fail intermittently and unreproducibly under transaction pooling.
2. **The CA must be passed as an object, not `ssl: 'verify-full'`.** The database uses a private CA (§12), which is not in the system trust store, so the string form fails to verify. Never fall back to `ssl: 'require'` or `rejectUnauthorized: false` to make a connection error go away — that silently removes MITM protection on a public port.
3. **Migrations use `DIRECT_DATABASE_URL`**, not the pooled URL — DDL through a transaction pooler misbehaves. Configure it in `drizzle.config.ts` with the same `ssl` object; Drizzle Kit's URL-only path discards custom CA options.
4. **The database is unreachable from Edge runtime.** Every file touching `db` must run on the Node runtime. This rules out DB access in `middleware.ts` — see §6.

---

## 6. Auth

Stateless JWT in an httpOnly cookie. No session table.

**Cookie:** name `session`, `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, 7-day expiry.
**Claims:** `{ sub: userId, email, role, name }`.

```ts
// lib/auth/session.ts — sign with jose (HS256, SESSION_SECRET)
// lib/auth/password.ts — bcryptjs, cost factor 10
```

**The runtime split, which matters:**

- `middleware.ts` runs on Edge. `jose` works there (WebCrypto). `bcryptjs` and the DB driver do **not**. So middleware only verifies the JWT and checks `role` for `/admin/*`. It performs redirects, nothing more.
- **Enrollment status is never read from the JWT.** It changes after the token is issued, so it must be checked against the database on every request that serves course content. That check lives in server components and server actions, on the Node runtime.

```ts
// lib/auth/guards.ts
requireUser()                        // → user, or redirect('/login')
requireAdmin()                       // → user, or 404 if role !== 'admin'
requireEnrollment(courseId)          // → user, or notFound() unless an approved enrollment exists
```

Use `notFound()` rather than a redirect for unauthorized content access, so the site does not leak which courses exist.

Next.js 15 note: `cookies()`, `headers()`, `params`, and `searchParams` are all async — `await` them.

### Access rules

| Resource | Anonymous | Learner, not approved | Learner, approved | Admin |
|---|---|---|---|---|
| Course catalog (published, title + summary) | ✅ | ✅ | ✅ | ✅ |
| Request enrollment | ❌ | ✅ | — | — |
| Topic list, documents, quizzes, recordings, live link | ❌ | ❌ | ✅ | ✅ |
| Document file stream | ❌ | ❌ | ✅ | ✅ |
| Own attempt history | ❌ | ❌ | ✅ | ✅ |
| Everything under `/admin` | ❌ | ❌ | ❌ | ✅ |

Draft courses are invisible to everyone but admins.

### Signup

Open registration. Anyone may create an account; an account alone grants no content access. Lowercase and trim the email before storing or comparing. No email verification and no password reset in v1 — an admin resets passwords manually from `/admin/users`.

---

## 7. File uploads — client-direct to Blob

**Vercel functions cap request bodies at ~4.5 MB.** A document must never be POSTed to a route handler. The browser uploads straight to Blob.

**Flow:**
1. Admin picks a file in the browser.
2. Client calls `upload()` from `@vercel/blob/client`, pointing at `/api/upload`.
3. `/api/upload` uses `handleUpload` to issue a short-lived token.
4. Browser uploads directly to a private Blob store and receives a blob URL.
5. Client calls a server action with `{ blobUrl, pathname, filename, sessionId, title }`.
6. The server action validates the private Blob hostname/path, downloads it with
   authenticated Blob SDK access and a 25 MB streaming limit, converts it (§8),
   and inserts the `documents` row.

```ts
// app/api/upload/route.ts — Node runtime
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  return Response.json(await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      await requireAdmin();          // CRITICAL — this route is publicly reachable
      return {
        allowedContentTypes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/markdown', 'text/plain', 'application/pdf',
        ],
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async () => {},
  }));
}
```

Without the `requireAdmin()` call, anyone on the internet can mint upload tokens against your Blob store.

### Serving files back

`GET /api/documents/[id]/file` → resolve the owning course via `document → topic →
course` (topics belong straight to the course) → `requireEnrollment(course)` → fetch the private blob server-side with the
Blob SDK → stream with the stored MIME and `Content-Disposition: inline`. Add
`?download=1` for `attachment`.

**The blob URL is never sent to the browser.** It stays in the database.

Images extracted from a docx are also private. Each is recorded in
`document_assets`, and converted HTML references
`/api/documents/[documentId]/assets/[assetId]` — enrollment-gated the same way —
instead of a Blob URL. Resolve and authorize that route by its `document_id`, and
reject any asset whose `document_id` does not match the route's document.

---

## 8. Document conversion

Runs once, at upload. Store the resulting HTML in `documents.html_content`.

**Accepted:** `.docx`, `.md`, `.pdf`. Reject `.doc`, `.odt`, `.rtf`, `.pages` with: *"Please export to .docx and upload again."*

### docx → HTML

`mammoth.convertToHtml`. Extract embedded images with `convertImage` — upload each
privately under `documents/{documentId}/` and return the gated application asset
route as `src`. Do **not** inline them as data URIs; it bloats the row.

Mammoth's defaults already map headings, bold, italic, lists, tables, and hyperlinks. Log `result.messages` on upload so unmapped Word styles are visible.

### Markdown → HTML

`markdown-it` with `html: false`, `linkify: true`, `typographer: true`.

### PDF

No conversion. Store the file, leave `html_content` null, render in an `<iframe>` pointed at the gated file route plus a download button.

### Sanitizing — non-negotiable

Every conversion output passes through `sanitize-html` before it is stored.

Allowed tags: `h1`–`h6, p, ul, ol, li, strong, em, u, s, a, img, table, thead, tbody, tfoot, tr, th, td, blockquote, pre, code, br, hr, sup, sub, span, div`.
Allowed attributes: `a[href, title]`, `img[src, alt, width, height]`, `th|td[colspan, rowspan]`.
Allowed schemes: `http, https, mailto`.
Force `rel="noopener noreferrer"` and `target="_blank"` on every `a`.
Strip all `style` attributes, all `class` attributes, and every `on*` handler.

Style the result with `@tailwindcss/typography` (`prose prose-slate max-w-none`) so documents read consistently on mobile and in dark mode. This is the reason we convert instead of embedding a viewer.

---

## 9. Quiz JSON

Admins paste JSON or upload a `.json` file. Validate with zod on submit; on failure, render the error path inline and store nothing.

```json
{
  "title": "Topic 01 — Explaining AI in plain language",
  "passingScore": 3,
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "prompt": "A customer says AI will just know the right answer. What is accurate?",
      "options": [
        { "id": "a", "text": "It predicts likely language; important claims still need checking." },
        { "id": "b", "text": "It looks up verified facts in a database." }
      ],
      "correct": ["a"],
      "explanation": "An LLM generates likely text rather than retrieving guaranteed truth.",
      "safetyCritical": true
    }
  ]
}
```

```ts
// lib/quiz/schema.ts
const Question = z.object({
  id: z.string().min(1),
  type: z.enum(['single', 'multiple', 'truefalse']),
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  correct: z.array(z.string()).min(1),
  explanation: z.string().min(1),
  safetyCritical: z.boolean().default(false),
});

export const QuizSchema = z.object({
  title: z.string().min(1),
  passingScore: z.number().int().min(0),
  questions: z.array(Question).min(1),
});
```

Refinements to enforce beyond the base shape:

- Question `id`s are unique within a quiz; option `id`s unique within a question.
- Every entry in `correct` matches an option `id`.
- `type: 'single'` and `'truefalse'` require exactly one `correct` entry.
- `passingScore` is not greater than `questions.length`.

### Grading

One point per question; a `multiple` question scores only on an exact set match. Return per-question correctness plus the `explanation` immediately on submit — this feedback is the point of the quiz.

`passed` = `score >= passingScore`. `safety_critical_passed` = every question flagged `safetyCritical` was answered correctly. Both are stored; the admin view shows them separately, because a learner can clear the score bar while missing a safety-critical item.

**Attempts are unlimited.** Compute `attempt_number` as `count(existing attempts by this user across all versions of this quiz) + 1`. Store every attempt; never overwrite.

---

## 10. Pages

### Learner

| Route | Contents |
|---|---|
| `/login`, `/signup` | Email + password |
| `/courses` | Published courses. Each card shows enrollment state: request access / pending / open |
| `/courses/[slug]` | Summary. If not approved: request button or pending notice. If approved: the ten topics by `position`, each showing whether its quiz has been attempted, plus the live link and a link to the recordings page |
| `/courses/[slug]/recordings` | One page. A flat list of recording links by `position`, each showing its label and date. Nothing else |
| `/courses/[slug]/topics/[position]` | Topic detail — documents (inline HTML or PDF iframe, plus download) and the quiz with attempt history |
| `/me` | Account details and all quiz attempts |

### Admin

| Route | Contents |
|---|---|
| `/admin` | Pending enrollment count, recent attempts, quick links |
| `/admin/courses` | List, create, publish/unpublish |
| `/admin/courses/[id]` | Course fields, course live URL, topic list with reordering and add-topic, and the recordings list edited inline (label, URL, date, reorder, delete) |
| `/admin/topics/[id]` | Topic fields, document upload and ordering, quiz editor |
| `/admin/enrollments` | Pending queue with approve/reject; filter by course and status |
| `/admin/results/[courseId]` | Every attempt: learner, quiz, version, score, passed, safety-critical, timestamp. Expand a row for per-question answers. Group by learner, newest first |
| `/admin/users` | List, change role, reset password |

Mutations are **server actions**, one file per domain under `actions/`. Route handlers exist only for the two cases in §7. Validate every action input with zod and re-check authorization inside the action — never rely on the UI having hidden a button.

---

## 11. Vercel configuration

```json
// vercel.json
{ "regions": ["<REGION NEAREST THE DATABASE VPS>"] }
```

Every query crosses the public internet to the VPS, so this materially affects page speed. Set it to the Vercel region closest to where the VPS is hosted before the first deploy.

On the conversion server action's route, set `export const maxDuration = 60`.

---

## 12. VPS setup — Postgres and PgBouncer

The database is on a self-hosted Ubuntu box. SSH, direct PostgreSQL, and all
administration stay on Tailscale. PgBouncer remains private until Vercel assigns
the project's fixed egress addresses.

1. PostgreSQL 16, `password_encryption = scram-sha-256`.
2. Separate runtime and migration roles. Neither is a superuser or can create databases or roles; only the migration role owns the application schema.
3. A generated password of 32+ characters, used nowhere else.
4. `pg_hba.conf`: `hostssl` entries only — no plaintext path.
5. PgBouncer on port 6432 in transaction mode with verified private-CA TLS.
6. Vercel Pro Static IPs (or Enterprise Secure Compute) are mandatory before public database connectivity. Allow only the exact assigned `/32` source addresses in both the IONOS firewall and UFW.
7. PostgreSQL port 5432 is never public. It remains restricted to the administrator Mac's Tailscale address in both UFW and `pg_hba.conf`.
8. Encrypted pgBackRest full/differential backups with a second off-server repository.

The app connects through PgBouncer with a pinned private CA and explicit TLS
server name. Migrations connect directly to 5432 over Tailscale and migration
credentials are never stored in Vercel.

---

## 13. Build phases

Each phase should end deployable and verifiable.

**Phase 1 — Foundation.** Next.js + Tailwind scaffold, Drizzle schema, first migration, `lib/db`, `lib/auth`, middleware, login/signup/logout, `scripts/seed-admin.ts`.
*Done when:* the seeded admin logs in and reaches `/admin`; a learner signs up, logs in, and is denied `/admin` with a 404.

**Phase 2 — Course structure.** Course and topic CRUD, topic reordering, publish/unpublish, learner catalog and course detail page.
*Done when:* an admin creates a published course with ten ordered topics, and a learner sees the course listed but cannot open its contents.

**Phase 3 — Enrollment.** Request flow, admin approval queue, `requireEnrollment` enforced on every content path.
*Done when:* a learner requests access, sees a pending state, is approved, and content unlocks. An unapproved learner hitting a session URL directly gets a 404.

**Phase 4 — Documents.** Blob client-upload, `/api/upload` with the admin guard, conversion pipeline, sanitizer, gated file route, reader page, delete.
*Done when:* a real `.docx` uploads to a topic, converts, and reads correctly on mobile; its embedded images render through the gated asset route; the original downloads; a PDF renders in-page; a logged-out request to the file and asset routes 404s. Test with `10-Day_AI_Customer-Conversation_Training_Program (1).docx` in this repo.

**Phase 5 — Quizzes.** JSON upload and validation on a topic, versioning on edit, quiz runner with per-question feedback, attempt storage, learner history, admin results view grouped by topic.
*Done when:* a quiz is taken twice with different answers and both attempts appear separately; editing the quiz creates version 2 while both earlier attempts still show the version 1 questions they were answered against.

**Phase 6 — Links and polish.** Course live URL, the recordings list and its page, dates in local timezone, empty states, form errors, responsive and keyboard passes, then seed the real course: one course, ten topics, and six recording rows labelled per the table in §1.

---

## 14. Mistakes to avoid

- Building a `sessions` table, session pages, or a topic-to-session relationship. Topics are the only structure; recordings are a flat list of links.
- Attaching documents or quizzes to anything other than a topic.
- POSTing an uploaded file to a route handler — breaks above 4.5 MB.
- Omitting `prepare: false` — intermittent, hard-to-reproduce query failures.
- Running migrations through PgBouncer instead of a direct connection.
- Any database call in `middleware.ts` — Edge runtime, wrong driver.
- Reading enrollment status from JWT claims instead of the database.
- Returning a Blob URL to a learner.
- Storing converted HTML without sanitizing it first.
- Mutating `quiz_versions.json` in place — it silently corrupts historical attempts.
- Skipping `requireAdmin()` inside `onBeforeGenerateToken`.
- Trusting the client for authorization because the UI hid the control.

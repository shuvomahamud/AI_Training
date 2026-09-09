import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { QuizPayload } from "@/lib/quiz/schema";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<"admin" | "learner">().notNull().default("learner"),
  sessionVersion: integer("session_version").notNull().default(0),
  ...timestamps,
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status").notNull().default("draft"),
  liveUrl: text("live_url"),
  ...timestamps,
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id),
  },
  (t) => [
    unique().on(t.courseId, t.userId),
    index("enrollments_user_id_idx").on(t.userId),
    index("enrollments_course_id_status_idx").on(t.courseId, t.status),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    moduleTitle: text("module_title"),
    title: text("title").notNull(),
    summary: text("summary"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    liveUrl: text("live_url"),
    ...timestamps,
  },
  (t) => [
    unique().on(t.courseId, t.position),
    index("sessions_course_id_position_idx").on(t.courseId, t.position),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    sourceType: text("source_type").notNull(),
    originalFilename: text("original_filename").notNull(),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    htmlContent: text("html_content"),
    ...timestamps,
  },
  (t) => [index("documents_session_id_idx").on(t.sessionId)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    currentVersionId: uuid("current_version_id").references(
      (): AnyPgColumn => quizVersions.id,
    ),
    ...timestamps,
  },
  (t) => [index("quizzes_session_id_idx").on(t.sessionId)],
);

export const quizVersions = pgTable(
  "quiz_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    json: jsonb("json").$type<QuizPayload>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [unique().on(t.quizId, t.versionNumber)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizVersionId: uuid("quiz_version_id")
      .notNull()
      .references(() => quizVersions.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    passed: boolean("passed").notNull(),
    safetyCriticalPassed: boolean("safety_critical_passed").notNull(),
    answersJson: jsonb("answers_json").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quiz_attempts_user_id_idx").on(t.userId),
    index("quiz_attempts_quiz_version_id_idx").on(t.quizVersionId),
  ],
);

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }),
  },
  (t) => [index("recordings_course_id_position_idx").on(t.courseId, t.position)],
);

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  attempts: many(quizAttempts),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  sessions: many(sessions),
  enrollments: many(enrollments),
  recordings: many(recordings),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  decidedByUser: one(users, {
    fields: [enrollments.decidedBy],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  course: one(courses, {
    fields: [sessions.courseId],
    references: [courses.id],
  }),
  documents: many(documents),
  quizzes: many(quizzes),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  session: one(sessions, {
    fields: [documents.sessionId],
    references: [sessions.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  session: one(sessions, {
    fields: [quizzes.sessionId],
    references: [sessions.id],
  }),
  currentVersion: one(quizVersions, {
    fields: [quizzes.currentVersionId],
    references: [quizVersions.id],
  }),
  versions: many(quizVersions),
}));

export const quizVersionsRelations = relations(quizVersions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizVersions.quizId],
    references: [quizzes.id],
  }),
  attempts: many(quizAttempts),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  version: one(quizVersions, {
    fields: [quizAttempts.quizVersionId],
    references: [quizVersions.id],
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  course: one(courses, {
    fields: [recordings.courseId],
    references: [courses.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type Course = InferSelectModel<typeof courses>;
export type Enrollment = InferSelectModel<typeof enrollments>;
export type Session = InferSelectModel<typeof sessions>;
export type Document = InferSelectModel<typeof documents>;
export type Quiz = InferSelectModel<typeof quizzes>;
export type QuizVersion = InferSelectModel<typeof quizVersions>;
export type QuizAttempt = InferSelectModel<typeof quizAttempts>;
export type Recording = InferSelectModel<typeof recordings>;

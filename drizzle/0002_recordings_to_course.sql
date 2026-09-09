ALTER TABLE "recordings" ADD COLUMN "course_id" uuid;--> statement-breakpoint
UPDATE "recordings" AS r
SET "course_id" = s."course_id"
FROM "sessions" AS s
WHERE r."session_id" = s."id";--> statement-breakpoint
DELETE FROM "recordings" WHERE "course_id" IS NULL;--> statement-breakpoint
ALTER TABLE "recordings" ALTER COLUMN "course_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" DROP CONSTRAINT "recordings_session_id_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "recordings" DROP COLUMN "session_id";--> statement-breakpoint
WITH ranked AS (
	SELECT id, ROW_NUMBER() OVER (
		PARTITION BY course_id
		ORDER BY position, recorded_at NULLS LAST, id
	) AS new_position
	FROM recordings
)
UPDATE recordings SET position = ranked.new_position
FROM ranked WHERE recordings.id = ranked.id;--> statement-breakpoint
CREATE INDEX "recordings_course_id_position_idx" ON "recordings" USING btree ("course_id","position");

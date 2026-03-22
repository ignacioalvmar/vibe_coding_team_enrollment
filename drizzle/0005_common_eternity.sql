ALTER TABLE "enrollments" ADD COLUMN "seat_index" integer;--> statement-breakpoint
UPDATE "enrollments" AS e
SET "seat_index" = ranked.idx
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY team_id
      ORDER BY enrolled_at NULLS LAST, id
    ) - 1 AS idx
  FROM "enrollments"
) AS ranked
WHERE e.id = ranked.id;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "seat_index" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_team_seat_unique" ON "enrollments" USING btree ("team_id","seat_index");

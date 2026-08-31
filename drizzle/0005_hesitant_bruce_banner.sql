DROP INDEX "review_assignment_round_reviewer_uq";--> statement-breakpoint
ALTER TABLE "review_assignment" ADD COLUMN "revoked_by_id" text;--> statement-breakpoint
ALTER TABLE "review_assignment" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "review_assignment" ADD CONSTRAINT "review_assignment_revoked_by_id_user_id_fk" FOREIGN KEY ("revoked_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_assignment_active_round_reviewer_uq" ON "review_assignment" USING btree ("review_round_id","reviewer_id") WHERE "review_assignment"."revoked_at" is null;
CREATE TABLE "live_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigserial NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid,
	"review_round_id" uuid,
	"review_item_id" uuid,
	"actor_id" text NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_document_version_id_document_version_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_review_round_id_review_round_id_fk" FOREIGN KEY ("review_round_id") REFERENCES "public"."review_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_review_item_id_review_item_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event" ADD CONSTRAINT "live_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_event_sequence_uq" ON "live_event" USING btree ("sequence");--> statement-breakpoint
CREATE INDEX "live_event_document_sequence_idx" ON "live_event" USING btree ("document_id","sequence");--> statement-breakpoint
CREATE INDEX "live_event_organization_sequence_idx" ON "live_event" USING btree ("organization_id","sequence");
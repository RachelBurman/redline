CREATE TABLE "document_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"client_id" varchar(120) NOT NULL,
	"selected_block_stable_key" varchar(120),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_presence" ADD CONSTRAINT "document_presence_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_presence" ADD CONSTRAINT "document_presence_document_version_id_document_version_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_presence" ADD CONSTRAINT "document_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_presence_client_uq" ON "document_presence" USING btree ("document_id","user_id","client_id");--> statement-breakpoint
CREATE INDEX "document_presence_active_idx" ON "document_presence" USING btree ("document_id","last_seen_at");
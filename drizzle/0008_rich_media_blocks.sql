CREATE TYPE "public"."media_asset_status" AS ENUM('pending', 'ready', 'quarantined', 'failed');--> statement-breakpoint
ALTER TYPE "public"."document_block_type" ADD VALUE 'rich_media' BEFORE 'unsupported';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_insert';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_replace';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_delete';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_caption';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_alt_text';--> statement-breakpoint
ALTER TYPE "public"."review_change_type" ADD VALUE 'media_reorder';--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"original_filename" varchar(500) NOT NULL,
	"object_key" text,
	"preview_object_key" text,
	"content_sha256" varchar(64),
	"mime_type" varchar(80),
	"byte_size" bigint,
	"width" integer,
	"height" integer,
	"status" "media_asset_status" DEFAULT 'pending' NOT NULL,
	"scanner" varchar(120),
	"failure_code" varchar(80),
	"failure_message" text,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "media_asset_dimensions_valid" CHECK (("media_asset"."width" is null and "media_asset"."height" is null) or ("media_asset"."width" > 0 and "media_asset"."height" > 0)),
	CONSTRAINT "media_asset_byte_size_valid" CHECK ("media_asset"."byte_size" is null or "media_asset"."byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "review_item" ADD COLUMN "proposed_media_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "review_item" ADD COLUMN "proposed_media" jsonb;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_asset_document_status_idx" ON "media_asset" USING btree ("document_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_object_key_uq" ON "media_asset" USING btree ("object_key") WHERE "media_asset"."object_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_preview_object_key_uq" ON "media_asset" USING btree ("preview_object_key") WHERE "media_asset"."preview_object_key" is not null;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_proposed_media_asset_id_media_asset_id_fk" FOREIGN KEY ("proposed_media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE restrict ON UPDATE no action;
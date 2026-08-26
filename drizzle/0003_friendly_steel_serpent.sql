ALTER TYPE "public"."document_version_origin" ADD VALUE 'restore';--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "restored_from_version_id" uuid;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_parent_version_id_document_version_id_fk" FOREIGN KEY ("parent_version_id") REFERENCES "public"."document_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_restored_from_version_id_document_version_id_fk" FOREIGN KEY ("restored_from_version_id") REFERENCES "public"."document_version"("id") ON DELETE restrict ON UPDATE no action;
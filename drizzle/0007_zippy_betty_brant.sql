CREATE TYPE "public"."signature_request_scope" AS ENUM('individual', 'everyone');--> statement-breakpoint
CREATE TYPE "public"."signature_request_status" AS ENUM('pending', 'completed', 'declined', 'cancelled', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."signature_slot_status" AS ENUM('pending', 'signed', 'declined');--> statement-breakpoint
CREATE TABLE "signature_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"review_round_id" uuid NOT NULL,
	"requested_by_id" text NOT NULL,
	"scope" "signature_request_scope" NOT NULL,
	"purpose" varchar(500) NOT NULL,
	"content_sha256" varchar(64) NOT NULL,
	"status" "signature_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_id" text,
	"superseded_at" timestamp with time zone,
	"superseded_by_version_id" uuid,
	CONSTRAINT "signature_request_purpose_not_blank" CHECK (length(trim("signature_request"."purpose")) >= 3)
);
--> statement-breakpoint
CREATE TABLE "signature_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature_request_id" uuid NOT NULL,
	"signer_id" text NOT NULL,
	"status" "signature_slot_status" DEFAULT 'pending' NOT NULL,
	"verified_email" text,
	"consent_statement" text,
	"idempotency_key" uuid,
	"signed_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signature_slot_signed_evidence_present" CHECK ("signature_slot"."status" <> 'signed' or ("signature_slot"."signed_at" is not null and "signature_slot"."verified_email" is not null and "signature_slot"."consent_statement" is not null and "signature_slot"."idempotency_key" is not null))
);
--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_document_version_id_document_version_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_review_round_id_review_round_id_fk" FOREIGN KEY ("review_round_id") REFERENCES "public"."review_round"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_cancelled_by_id_user_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_request" ADD CONSTRAINT "signature_request_superseded_by_version_id_document_version_id_fk" FOREIGN KEY ("superseded_by_version_id") REFERENCES "public"."document_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_slot" ADD CONSTRAINT "signature_slot_signature_request_id_signature_request_id_fk" FOREIGN KEY ("signature_request_id") REFERENCES "public"."signature_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_slot" ADD CONSTRAINT "signature_slot_signer_id_user_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signature_request_document_version_idx" ON "signature_request" USING btree ("document_id","document_version_id","created_at");--> statement-breakpoint
CREATE INDEX "signature_request_organization_status_idx" ON "signature_request" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_slot_request_signer_uq" ON "signature_slot" USING btree ("signature_request_id","signer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_slot_idempotency_uq" ON "signature_slot" USING btree ("signature_request_id","signer_id","idempotency_key") WHERE "signature_slot"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "signature_slot_signer_status_idx" ON "signature_slot" USING btree ("signer_id","status");
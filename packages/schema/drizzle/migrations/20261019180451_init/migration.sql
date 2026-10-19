CREATE TABLE "mls_gallery_requests" (
	"listing_key" varchar(255) PRIMARY KEY,
	"status" varchar(24) DEFAULT 'queued' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"run_token" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "idx_mls_gallery_requests_queue" ON "mls_gallery_requests" ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "mls_gallery_requests" ADD CONSTRAINT "mls_gallery_requests_listing_key_properties_listing_key_fkey" FOREIGN KEY ("listing_key") REFERENCES "properties"("listing_key") ON DELETE CASCADE;
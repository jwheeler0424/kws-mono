ALTER TABLE "mls_media" ADD COLUMN "downloaded_source_timestamp" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mls_media" ADD COLUMN "acquisition_token" uuid;--> statement-breakpoint
ALTER TABLE "mls_media" ADD COLUMN "acquisition_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mls_media" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mls_media" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mls_media" ADD COLUMN "last_acquisition_error" varchar(255);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "list_agent_preferred_phone" varchar(32);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "list_office_email" varchar(256);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "co_list_agent_preferred_phone" varchar(32);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "co_list_agent_email" varchar(256);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "co_list_office_email" varchar(256);--> statement-breakpoint
ALTER TABLE "mls_sync_cursors" ADD COLUMN "run_token" uuid;--> statement-breakpoint
ALTER TABLE "mls_sync_cursors" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_mls_media_next_attempt" ON "mls_media" ("next_attempt_at","acquisition_lease_until");
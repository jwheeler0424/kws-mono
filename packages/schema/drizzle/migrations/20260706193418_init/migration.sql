CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT array_to_string($1, $2); $$;

CREATE TYPE "comment_status_enum" AS ENUM('approved', 'pending', 'spam', 'trash');--> statement-breakpoint
CREATE TYPE "comment_type" AS ENUM('comment', 'pingback', 'trackback', 'review');--> statement-breakpoint
CREATE TYPE "post_comment_status" AS ENUM('open', 'closed', 'registered_only');--> statement-breakpoint
CREATE TYPE "post_status" AS ENUM('draft', 'pending', 'published', 'scheduled', 'private', 'trash', 'auto_draft');--> statement-breakpoint
CREATE TYPE "post_type" AS ENUM('post', 'page', 'revision', 'attachment', 'custom');--> statement-breakpoint
CREATE TYPE "post_visibility" AS ENUM('public', 'private', 'password');--> statement-breakpoint
CREATE TYPE "option_scope" AS ENUM('global', 'organization', 'user');--> statement-breakpoint
CREATE TYPE "option_type" AS ENUM('string', 'number', 'boolean', 'json', 'array');--> statement-breakpoint
CREATE TYPE "activity_type" AS ENUM('call', 'email', 'meeting', 'sms', 'note', 'task');--> statement-breakpoint
CREATE TYPE "address_type" AS ENUM('home', 'work', 'billing', 'shipping', 'other');--> statement-breakpoint
CREATE TYPE "email_type" AS ENUM('personal', 'work', 'billing', 'support', 'other');--> statement-breakpoint
CREATE TYPE "phone_type" AS ENUM('mobile', 'home', 'work', 'fax', 'other');--> statement-breakpoint
CREATE TYPE "social_platform" AS ENUM('linkedin', 'x', 'facebook', 'instagram', 'tiktok', 'github', 'other');--> statement-breakpoint
CREATE TYPE "contact_source" AS ENUM('website', 'referral', 'import', 'newsletter', 'event', 'social_media', 'other');--> statement-breakpoint
CREATE TYPE "contact_status" AS ENUM('lead', 'prospect', 'customer', 'subscriber', 'inactive');--> statement-breakpoint
CREATE TYPE "contact_type" AS ENUM('person', 'organization');--> statement-breakpoint
CREATE TYPE "task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "storage_provider" AS ENUM('s3', 'r2', 'local');--> statement-breakpoint
CREATE TYPE "media_option_scope" AS ENUM('global', 'organization', 'user');--> statement-breakpoint
CREATE TYPE "media_option_type" AS ENUM('string', 'number', 'boolean', 'json', 'array');--> statement-breakpoint
CREATE TYPE "property_type" AS ENUM('BusinessOpportunity', 'CommercialLease', 'CommercialSale', 'Farm', 'Land', 'ManufacturedInPark', 'Residential', 'ResidentialIncome', 'ResidentialLease');--> statement-breakpoint
CREATE TYPE "standard_status" AS ENUM('Active', 'ActiveUnderContract', 'Canceled', 'Closed', 'ComingSoon', 'Delete', 'Expired', 'Hold', 'Incomplete', 'Pending', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('CONTACT_REQUEST');--> statement-breakpoint
CREATE TYPE "email_bounce_type" AS ENUM('hard', 'soft', 'undetermined');--> statement-breakpoint
CREATE TYPE "email_campaign_status" AS ENUM('draft', 'sending', 'sent', 'paused');--> statement-breakpoint
CREATE TYPE "email_event_type" AS ENUM('open', 'open_mpp', 'click', 'click_bot', 'bounce_hard', 'bounce_soft', 'unsubscribed', 'spam_complaint', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "email_send_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced_soft', 'bounced_hard', 'unsubscribed', 'spam_complaint', 'failed');--> statement-breakpoint
CREATE TYPE "email_tracking_event_type" AS ENUM('open', 'click', 'unsub');--> statement-breakpoint
CREATE TYPE "email_report_format" AS ENUM('csv', 'json');--> statement-breakpoint
CREATE TYPE "email_report_status" AS ENUM('pending', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "email_suppression_reason" AS ENUM('hard_bounce', 'unsubscribed', 'spam_complaint', 'manual');--> statement-breakpoint
CREATE TYPE "taxonomy_type" AS ENUM('blog_category', 'blog_tag', 'asset_format', 'media_format', 'contact_tag', 'album', 'custom');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"team_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"inviter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "organization_role" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text,
	"public_key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	"active_team_id" text
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" uuid NOT NULL,
	"verified" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"last_login_method" text,
	"two_factor_enabled" boolean DEFAULT false,
	"username" text UNIQUE,
	"display_username" text,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_flags" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_meta" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"comment_id" uuid NOT NULL,
	"meta_key" varchar(255) NOT NULL,
	"meta_value" text,
	"meta_value_json" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"notify_on_new_comment" boolean DEFAULT true NOT NULL,
	"notify_on_reply" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"author_name" varchar(255) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"author_url" varchar(500),
	"author_ip" varchar(45),
	"author_user_agent" varchar(500),
	"content" text NOT NULL,
	"parent_id" uuid,
	"type" "comment_type" DEFAULT 'comment'::"comment_type" NOT NULL,
	"status" "comment_status_enum" DEFAULT 'pending'::"comment_status_enum" NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"spam_score" integer DEFAULT 0 NOT NULL,
	"is_spam" boolean DEFAULT false NOT NULL,
	"spam_detection_data" jsonb,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("content"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("author_name"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "post_media_attachments" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"organization_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"caption_override" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_meta" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"meta_key" varchar(255) NOT NULL,
	"meta_value" text,
	"meta_value_json" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_relationships" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"related_post_id" uuid NOT NULL,
	"relationship_type" varchar(100) DEFAULT 'related' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content_json" jsonb,
	"raw_text" text DEFAULT '',
	"author_id" uuid,
	"changes_summary" text,
	"is_autosave" boolean DEFAULT false NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid,
	"author_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content_json" jsonb,
	"raw_text" text DEFAULT '',
	"type" "post_type" DEFAULT 'post'::"post_type" NOT NULL,
	"status" "post_status" DEFAULT 'draft'::"post_status" NOT NULL,
	"visibility" "post_visibility" DEFAULT 'public'::"post_visibility" NOT NULL,
	"password_hash" text,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"parent_id" uuid,
	"menu_order" integer DEFAULT 0 NOT NULL,
	"comment_status" "post_comment_status" DEFAULT 'open'::"post_comment_status" NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"ping_status" boolean DEFAULT true NOT NULL,
	"to_ping" text,
	"pinged" text,
	"meta_title" varchar(500),
	"meta_description" text,
	"meta_keywords" varchar(500),
	"canonical_url" varchar(500),
	"featured_image_id" uuid,
	"featured_media_id" uuid,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_revision" boolean DEFAULT false NOT NULL,
	"revision_of" uuid,
	"is_sticky" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_modified_by" varchar(255),
	"cached_search_terms" text DEFAULT '',
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("title"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("raw_text"::text, '') || ' ' || coalesce("cached_search_terms"::text, '')), 'D')) STORED
);
--> statement-breakpoint
CREATE TABLE "post_term_relationships" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"organization_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_options" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"scope" "option_scope" DEFAULT 'organization'::"option_scope" NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"option_name" varchar(255) NOT NULL,
	"option_value" text,
	"option_value_json" jsonb,
	"option_type" "option_type" DEFAULT 'string'::"option_type" NOT NULL,
	"autoload" boolean DEFAULT false NOT NULL,
	"description" text,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "preview_tokens" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"post_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"max_views" integer,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"property_address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("name"::text, '') || ' ' || coalesce("email"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("property_address"::text, '') || ' ' || coalesce("phone"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("message"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" text,
	"body" text,
	"created_by" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_addresses" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"type" "address_type" NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text,
	"state_province" text,
	"postal_code" text,
	"country_code" text,
	"latitude" text,
	"longitude" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_emails" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"email" text NOT NULL,
	"type" "email_type" DEFAULT 'personal'::"email_type" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"do_not_email" boolean DEFAULT false NOT NULL,
	"bounced_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_phones" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"country_code" text,
	"phone_number" text NOT NULL,
	"extension" text,
	"type" "phone_type" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"do_not_call" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_social_profiles" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"username" text,
	"profile_url" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_websites" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"employee_count" integer,
	"annual_revenue" bigint,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_companies" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_newsletters" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"company_id" uuid,
	"subscribed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"type" "contact_type" DEFAULT 'person'::"contact_type" NOT NULL,
	"first_name" text,
	"middle_name" text,
	"last_name" text,
	"preferred_name" text,
	"prefix" text,
	"suffix" text,
	"job_title" text,
	"department" text,
	"birthday" date,
	"timezone" text,
	"language" text,
	"source" "contact_source" DEFAULT 'website'::"contact_source" NOT NULL,
	"status" "contact_status" DEFAULT 'subscriber'::"contact_status" NOT NULL,
	"notes" text,
	"owner_user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_search" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"names" text,
	"emails" text,
	"phones" text,
	"addresses" text,
	"companies" text,
	"tags" text,
	"notes" text,
	"activity_text" text,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("names"::text, '') || ' ' || coalesce("emails"::text, '') || ' ' || coalesce("companies"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("phones"::text, '') || ' ' || coalesce("addresses"::text, '') || ' ' || coalesce("tags"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("notes"::text, '') || ' ' || coalesce("activity_text"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"contact_id" uuid NOT NULL,
	"assigned_to" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending'::"task_status" NOT NULL,
	"priority" "task_priority" DEFAULT 'medium'::"task_priority" NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geo_cache" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"cache_key" varchar(256) NOT NULL,
	"query" text NOT NULL,
	"type" varchar(32) NOT NULL,
	"lat" varchar(32) NOT NULL,
	"lng" varchar(32) NOT NULL,
	"display_name" text NOT NULL,
	"r6_cell" varchar(20) NOT NULL,
	"r7_cell" varchar(20) NOT NULL,
	"r8_cell" varchar(20) NOT NULL,
	"search_cells" text[] NOT NULL,
	"search_resolution" integer NOT NULL,
	"bbox_min_lng" varchar(32) NOT NULL,
	"bbox_min_lat" varchar(32) NOT NULL,
	"bbox_max_lng" varchar(32) NOT NULL,
	"bbox_max_lat" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid,
	"uploaded_by" uuid,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"file_extension" varchar(10) NOT NULL,
	"storage_provider" "storage_provider" DEFAULT 'local'::"storage_provider" NOT NULL,
	"storage_path" text NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"bucket_name" varchar(100),
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"aspect_ratio" numeric(10,4),
	"focal_point_x" integer DEFAULT 50,
	"focal_point_y" integer DEFAULT 50,
	"alt_text" text,
	"caption" text,
	"description" text,
	"title" varchar(500),
	"folder_id" uuid,
	"exif_data" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"cached_search_terms" text DEFAULT '',
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("title"::text, '') || ' ' || coalesce("alt_text"::text, '') || ' ' || coalesce("caption"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("description"::text, '') || ' ' || coalesce("filename"::text, '') || ' ' || coalesce("original_filename"::text, '') || ' ' || coalesce("mime_type"::text, '') || ' ' || coalesce("file_extension"::text, '') || ' ' || coalesce("cached_search_terms"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "media_folders" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"parent_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_variants" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"media_id" uuid NOT NULL,
	"variant_name" varchar(50) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_size" integer NOT NULL,
	"url" text NOT NULL,
	"storage_path" text NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_options" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"scope" "media_option_scope" DEFAULT 'organization'::"media_option_scope" NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"option_name" varchar(255) NOT NULL,
	"option_value" text,
	"option_value_json" jsonb,
	"option_type" "media_option_type" DEFAULT 'string'::"media_option_type" NOT NULL,
	"autoload" boolean DEFAULT false NOT NULL,
	"description" text,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_term_relationships" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"media_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"organization_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lookups" (
	"lookup_key" varchar(255) PRIMARY KEY,
	"lookup_name" varchar(255) NOT NULL,
	"lookup_value" text,
	"standard_lookup_value" text,
	"mlg_can_use" varchar(1024)[] DEFAULT '{}'::varchar(1024)[],
	"originating_system_name" varchar(255) DEFAULT 'nwmls',
	"modification_timestamp" timestamp with time zone,
	"mlg_can_view" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("lookup_name"::text, '') || ' ' || coalesce("lookup_key"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("lookup_value"::text, '') || ' ' || coalesce("standard_lookup_value"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce(immutable_array_to_string(mlg_can_use, ' '::text), '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "mls_media" (
	"media_key" varchar(255) PRIMARY KEY,
	"image_height" integer,
	"image_size_description" varchar(1024),
	"image_width" integer,
	"long_description" varchar(1024),
	"media_modification_timestamp" timestamp with time zone,
	"media_object_id" varchar(255),
	"media_url" varchar(8000),
	"order" integer,
	"permission" varchar(255)[],
	"preferred_photo_yn" boolean,
	"resource_record_key" varchar(255),
	"media_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("long_description"::text, '') || ' ' || coalesce("media_key"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("media_url"::text, '') || ' ' || coalesce("image_size_description"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("resource_record_key"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "members" (
	"member_mls_id" varchar(25) PRIMARY KEY,
	"member_key" varchar(255),
	"originating_system_name" varchar(255) DEFAULT 'nwmls',
	"member_first_name" varchar(50),
	"member_full_name" varchar(150),
	"member_last_name" varchar(50),
	"member_middle_name" varchar(50),
	"member_nickname" varchar(50),
	"member_office_phone" varchar(16),
	"member_office_phone_ext" varchar(10),
	"member_state_license" varchar(50),
	"member_status" varchar(25),
	"member_type" varchar(50),
	"office_key" varchar(255),
	"office_mls_id" varchar(25),
	"mlg_can_use" varchar(1024)[] DEFAULT '{}'::varchar(1024)[],
	"modification_timestamp" timestamp with time zone,
	"mlg_can_view" boolean DEFAULT true,
	"nwm" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("member_full_name"::text, '') || ' ' || coalesce("member_first_name"::text, '') || ' ' || coalesce("member_last_name"::text, '') || ' ' || coalesce("member_middle_name"::text, '') || ' ' || coalesce("member_nickname"::text, '') || ' ' || coalesce("member_mls_id"::text, '') || ' ' || coalesce("member_key"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("member_state_license"::text, '') || ' ' || coalesce("office_mls_id"::text, '') || ' ' || coalesce("office_key"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("member_type"::text, '') || ' ' || coalesce("member_status"::text, '') || ' ' || coalesce("member_office_phone"::text, '') || ' ' || coalesce("member_office_phone_ext"::text, '')), 'C') ||
        setweight(to_tsvector('english'::regconfig, coalesce(immutable_array_to_string(mlg_can_use, ' '::text), '')), 'D')) STORED
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"office_mls_id" varchar(25) PRIMARY KEY,
	"main_office_key" varchar(255),
	"main_office_mls_id" varchar(25),
	"mlg_can_use" varchar(1024)[] DEFAULT '{}'::varchar(1024)[],
	"mlg_can_view" boolean DEFAULT true,
	"modification_timestamp" timestamp with time zone,
	"office_address1" varchar(50),
	"office_address2" varchar(50),
	"office_broker_key" varchar(255),
	"office_broker_mls_id" varchar(25),
	"office_city" varchar(50),
	"office_county_or_parish" varchar(50),
	"office_email" varchar(80),
	"office_fax" varchar(16),
	"office_key" varchar(255),
	"office_name" varchar(255),
	"office_phone" varchar(16),
	"office_postal_code" varchar(10),
	"office_postal_code_plus_4" varchar(4),
	"office_state_or_province" varchar(2),
	"office_status" varchar(25),
	"originating_system_name" varchar(255) DEFAULT 'nwmls',
	"photos_change_timestamp" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("office_name"::text, '') || ' ' || coalesce("office_mls_id"::text, '') || ' ' || coalesce("main_office_mls_id"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("office_address1"::text, '') || ' ' || coalesce("office_address2"::text, '') || ' ' || coalesce("office_city"::text, '') || ' ' || coalesce("office_state_or_province"::text, '') || ' ' || coalesce("office_postal_code"::text, '') || ' ' || coalesce("office_postal_code_plus_4"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("office_email"::text, '') || ' ' || coalesce("office_phone"::text, '') || ' ' || coalesce("office_status"::text, '') || ' ' || coalesce("office_broker_mls_id"::text, '') || ' ' || coalesce("office_key"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "open_houses" (
	"open_house_key" varchar(255) PRIMARY KEY,
	"listing_key" varchar(64),
	"listing_id" varchar(255),
	"mlg_can_use" varchar(1024)[] DEFAULT '{}'::varchar(1024)[],
	"originating_system_name" varchar(255) DEFAULT 'nwmls',
	"open_house_date" timestamp with time zone,
	"open_house_start_time" timestamp with time zone,
	"open_house_end_time" timestamp with time zone,
	"open_house_remarks" varchar(500),
	"open_house_type" varchar(25),
	"refreshments" varchar(255),
	"modification_timestamp" timestamp with time zone,
	"mlg_can_view" boolean DEFAULT true,
	"nwm" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("listing_key"::text, '') || ' ' || coalesce("listing_id"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("open_house_remarks"::text, '') || ' ' || coalesce("open_house_type"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("refreshments"::text, '')), 'C') ||
        setweight(to_tsvector('english'::regconfig, coalesce(immutable_array_to_string(mlg_can_use, ' '::text), '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"listing_key" varchar(64) UNIQUE,
	"listing_id" varchar(64),
	"originating_system_name" varchar(32) DEFAULT 'nwmls' NOT NULL,
	"standard_status" "standard_status",
	"mls_status" varchar(64),
	"property_type" "property_type",
	"property_sub_type" varchar(128),
	"mlg_can_view" boolean DEFAULT true NOT NULL,
	"modification_timestamp" timestamp with time zone,
	"original_entry_timestamp" timestamp with time zone,
	"major_change_timestamp" timestamp with time zone,
	"major_change_type" varchar(128),
	"photos_change_timestamp" timestamp with time zone,
	"status_change_timestamp" timestamp with time zone,
	"price_change_timestamp" timestamp with time zone,
	"contract_status_change_date" timestamp with time zone,
	"purchase_contract_date" timestamp with time zone,
	"off_market_date" timestamp with time zone,
	"closing_date" timestamp with time zone,
	"internet_address_display_yn" boolean DEFAULT true,
	"internet_automated_valuation_display_yn" boolean DEFAULT true,
	"availability_date" timestamp with time zone,
	"contingent_date" timestamp with time zone,
	"close_date" timestamp with time zone,
	"on_market_date" timestamp with time zone,
	"cumulative_days_on_market" integer,
	"originating_system_modification_timestamp" timestamp with time zone,
	"internet_consumer_comment_yn" boolean,
	"internet_entire_listing_display_yn" boolean,
	"mlg_can_use" text[],
	"source_system_name" varchar(255),
	"unparsed_address" text,
	"street_number" varchar(32),
	"street_number_numeric" integer,
	"street_dir_prefix" varchar(16),
	"street_name" varchar(128),
	"street_suffix" varchar(32),
	"street_dir_suffix" varchar(16),
	"unit_number" varchar(32),
	"city" varchar(128),
	"state_or_province" varchar(32),
	"postal_code" varchar(16),
	"postal_code_plus4" varchar(4),
	"country" varchar(8) DEFAULT 'US',
	"county_or_parish" varchar(128),
	"subdivision_name" varchar(256),
	"mls_area_major" varchar(64),
	"mls_area_minor" varchar(64),
	"directions" text,
	"latitude" real,
	"longitude" real,
	"h3_r6" varchar(20),
	"h3_r7" varchar(20),
	"h3_r8" varchar(20),
	"list_price" numeric(14,2),
	"list_price_low" numeric(14,2),
	"original_list_price" numeric(14,2),
	"previous_list_price" numeric(14,2),
	"close_price" numeric(14,2),
	"tax_assessed_value" numeric(14,2),
	"bedrooms_total" integer,
	"bathrooms_full" integer,
	"bathrooms_half" integer,
	"bathrooms_three_quarter" integer,
	"bathrooms_one_quarter" integer,
	"bathrooms_total_integer" integer,
	"rooms_total" integer,
	"stories_total" integer,
	"levels" text[],
	"garage_spaces" integer,
	"parking_total" integer,
	"additional_parcels_description" varchar(255),
	"bedrooms_possible" integer,
	"body_type" text[],
	"carport_spaces" numeric(13,2),
	"carport_yn" boolean,
	"covered_spaces" numeric(13,2),
	"open_parking_spaces" numeric(13,2),
	"main_level_bathrooms" integer,
	"main_level_bedrooms" integer,
	"living_area" numeric(14,2),
	"living_area_units" varchar(32),
	"lot_size_acres" numeric(10,4),
	"lot_size_square_feet" numeric(12,2),
	"building_area_total" numeric(14,2),
	"above_grade_finished_area" numeric(14,2),
	"below_grade_finished_area" numeric(14,2),
	"lot_size_dimensions" varchar(150),
	"lot_size_units" varchar(25),
	"leasable_area" numeric(13,2),
	"leasable_area_units" varchar(25),
	"number_of_units_in_community" integer,
	"number_of_units_total" integer,
	"year_built" integer,
	"year_built_source" varchar(64),
	"new_construction_yn" boolean,
	"property_condition" text[],
	"architectural_style" text[],
	"construction_materials" text[],
	"foundation_details" text[],
	"roof" text[],
	"common_walls" text[],
	"builder_name" varchar(50),
	"building_area_units" varchar(25),
	"building_features" text[],
	"building_name" varchar(50),
	"year_built_effective" integer,
	"year_established" integer,
	"years_current_owner" integer,
	"make" varchar(50),
	"model" varchar(50),
	"mobile_home_remains_yn" boolean,
	"heating" text[],
	"cooling" text[],
	"electric" text[],
	"water_source" text[],
	"sewer" text[],
	"utilities" text[],
	"cooling_yn" boolean,
	"electric_on_property_yn" boolean,
	"heating_yn" boolean,
	"irrigation_source" text[],
	"irrigation_water_rights_yn" boolean,
	"lease_assignable_yn" boolean,
	"operating_expense_includes" text[],
	"power_production_type" text[],
	"interior_features" text[],
	"flooring" text[],
	"appliances" text[],
	"fireplace_features" text[],
	"fireplace_yn" boolean,
	"fireplaces_total" integer,
	"laundry_features" text[],
	"window_features" text[],
	"accessibility_features" text[],
	"entry_location" varchar(50),
	"furnished" varchar(50),
	"inclusions" text,
	"other_equipment" text[],
	"pets_allowed" text[],
	"possession" text[],
	"security_features" text[],
	"skirt" text[],
	"special_licenses" text[],
	"exterior_features" text[],
	"patio_and_porch_features" text[],
	"fencing" text[],
	"other_structures" text[],
	"lot_features" text[],
	"frontage_type" text[],
	"view" text[],
	"waterfront_yn" boolean,
	"waterfront_features" text[],
	"pool_private_yn" boolean,
	"pool_features" text[],
	"spa_features" text[],
	"horse_yn" boolean,
	"direction_faces" varchar(25),
	"elevation" integer,
	"elevation_units" varchar(10),
	"possible_use" text[],
	"road_responsibility" text[],
	"road_surface_type" text[],
	"sign_on_property_yn" boolean,
	"spa_yn" boolean,
	"structure_type" text[],
	"topography" varchar(255),
	"vegetation" text[],
	"view_yn" boolean,
	"zoning" varchar(25),
	"zoning_description" varchar(255),
	"community_features" text[],
	"senior_community_yn" boolean,
	"association_yn" boolean,
	"association_name" varchar(256),
	"association_fee" numeric(14,2),
	"association_fee_frequency" varchar(64),
	"association_fee_includes" text[],
	"association_amenities" text[],
	"association_phone" varchar(32),
	"association_email" varchar(256),
	"elementary_school" varchar(128),
	"middle_or_junior_school" varchar(128),
	"high_school" varchar(128),
	"elementary_school_district" varchar(128),
	"middle_or_junior_school_district" varchar(128),
	"high_school_district" varchar(128),
	"tax_year" integer,
	"tax_legal_description" text,
	"parcel_number" varchar(128),
	"tax_map_number" varchar(64),
	"listing_terms" text[],
	"buyer_financing" text[],
	"current_financing" text[],
	"special_listing_conditions" text[],
	"listing_contract_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"lease_expiration" timestamp with time zone,
	"rent_includes" text[],
	"cap_rate" numeric(13,2),
	"electric_expense" numeric(13,2),
	"fuel_expense" numeric(13,2),
	"gross_scheduled_income" numeric(13,2),
	"insurance_expense" numeric(13,2),
	"land_lease_amount" numeric(13,2),
	"land_lease_amount_frequency" varchar(25),
	"land_lease_yn" boolean,
	"net_operating_income" numeric(13,2),
	"other_expense" numeric(13,2),
	"ownership" text,
	"tax_annual_amount" numeric(13,2),
	"total_actual_rent" numeric(13,2),
	"list_agent_key" varchar(64),
	"list_agent_mls_id" varchar(64),
	"list_agent_full_name" varchar(256),
	"list_agent_email" varchar(256),
	"list_agent_direct_phone" varchar(32),
	"list_office_key" varchar(64),
	"list_office_mls_id" varchar(64),
	"list_office_name" varchar(256),
	"list_office_phone" varchar(32),
	"co_list_agent_key" varchar(64),
	"co_list_agent_mls_id" varchar(64),
	"co_list_agent_full_name" varchar(256),
	"buyer_agent_key" varchar(64),
	"buyer_agent_mls_id" varchar(64),
	"buyer_agent_full_name" varchar(256),
	"buyer_agent_office_phone" varchar(16),
	"buyer_agent_office_phone_ext" varchar(10),
	"buyer_office_key" varchar(64),
	"buyer_office_mls_id" varchar(64),
	"buyer_office_name" varchar(256),
	"buyer_office_phone" varchar(16),
	"buyer_office_phone_ext" varchar(10),
	"co_buyer_agent_full_name" varchar(150),
	"co_buyer_agent_key" varchar(255),
	"co_buyer_agent_mls_id" varchar(25),
	"co_buyer_office_key" varchar(255),
	"co_buyer_office_mls_id" varchar(25),
	"co_buyer_office_name" varchar(255),
	"co_buyer_office_phone" varchar(16),
	"co_buyer_office_phone_ext" varchar(10),
	"co_list_office_key" varchar(255),
	"co_list_office_mls_id" varchar(25),
	"co_list_office_name" varchar(255),
	"co_list_office_phone" varchar(16),
	"co_list_office_phone_ext" varchar(10),
	"list_office_phone_ext" varchar(10),
	"business_name" varchar(255),
	"business_type" text[],
	"park_manager_name" varchar(50),
	"park_manager_phone" varchar(16),
	"park_name" varchar(50),
	"serial_u" varchar(25),
	"buyer_agency_compensation" varchar(32),
	"buyer_agency_compensation_type" varchar(32),
	"buyer_brokerage_compensation" varchar(25),
	"buyer_brokerage_compensation_type" varchar(25),
	"public_remarks" text,
	"private_remarks" text,
	"syndication_remarks" text,
	"syndicate_to" text[],
	"photos_count" integer,
	"videos_count" integer,
	"virtual_tour_url_unbranded" text,
	"virtual_tour_url_branded" text,
	"parking_features" text[],
	"garage_yn" boolean,
	"attached_garage_yn" boolean,
	"open_parking_yn" boolean,
	"basement" text[],
	"basement_yn" boolean,
	"green_building_verification_type" text[],
	"green_energy_efficient" text[],
	"green_energy_generation" text[],
	"nwm" jsonb,
	"featured_listing_yn" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("unparsed_address"::text, '') || ' ' || coalesce("listing_id"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("property_sub_type"::text, '') || ' ' || coalesce("list_agent_full_name"::text, '') || ' ' || coalesce("list_office_name"::text, '') || ' ' || coalesce("year_built"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce(immutable_array_to_string(interior_features, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(exterior_features, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(appliances, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(heating, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(cooling, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(community_features, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(view, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(waterfront_features, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(lot_features, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(construction_materials, ' '::text), '') || ' ' || coalesce(immutable_array_to_string(parking_features, ' '::text), '')), 'C') ||
        setweight(to_tsvector('english'::regconfig, coalesce("public_remarks"::text, '')), 'D')) STORED
);
--> statement-breakpoint
CREATE TABLE "property_rooms" (
	"room_key" varchar(255) PRIMARY KEY,
	"listing_key" varchar(64) NOT NULL,
	"room_description" varchar(1024),
	"room_dimensions" varchar(50),
	"room_length" numeric(13,2),
	"room_length_width_units" varchar(25),
	"room_level" varchar(25),
	"room_type" varchar(1024),
	"room_width" numeric(13,2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("room_key"::text, '') || ' ' || coalesce("listing_key"::text, '') || ' ' || coalesce("room_type"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("room_description"::text, '') || ' ' || coalesce("room_dimensions"::text, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("room_level"::text, '') || ' ' || coalesce("room_length_width_units"::text, '')), 'C')) STORED
);
--> statement-breakpoint
CREATE TABLE "property_unit_types" (
	"unit_type_key" varchar(255) PRIMARY KEY,
	"listing_key" varchar(64) NOT NULL,
	"unit_type_beds_total" integer,
	"unit_type_baths_total" integer,
	"unit_type_actual_rent" numeric(13,2),
	"nwm" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"search_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english'::regconfig, coalesce("unit_type_key"::text, '') || ' ' || coalesce("listing_key"::text, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("unit_type_beds_total"::text, '') || ' ' || coalesce("unit_type_baths_total"::text, '') || ' ' || coalesce("unit_type_actual_rent"::text, '')), 'B')) STORED
);
--> statement-breakpoint
CREATE TABLE "mls_sync_cursors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mls_sync_cursors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"resource" varchar(64) NOT NULL,
	"originating_system_name" varchar(32) NOT NULL,
	"last_modified_timestamp" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_run_status" varchar(32),
	"last_run_error" text,
	"checkpoint_request_url" text,
	"checkpoint_next_url" text,
	"checkpoint_recent_request_urls" text,
	"checkpointed_at" timestamp with time zone,
	"total_records_processed" integer DEFAULT 0,
	"last_run_records_processed" integer DEFAULT 0,
	"phase" varchar(32) DEFAULT 'delta',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"user_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"action" text NOT NULL,
	"actor" text,
	"target" text,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_bounces" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"send_id" uuid NOT NULL,
	"bounce_type" "email_bounce_type" NOT NULL,
	"smtp_code" varchar(3),
	"enhanced_code" varchar(10),
	"diagnostic" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaign_stats" (
	"campaign_id" uuid PRIMARY KEY,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"open_count_raw" integer DEFAULT 0 NOT NULL,
	"open_count_mpp" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"click_count_total" integer DEFAULT 0 NOT NULL,
	"click_count_bot" integer DEFAULT 0 NOT NULL,
	"bounce_hard_count" integer DEFAULT 0 NOT NULL,
	"bounce_soft_count" integer DEFAULT 0 NOT NULL,
	"unsubscribe_count" integer DEFAULT 0 NOT NULL,
	"spam_complaint_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"status" "email_campaign_status" DEFAULT 'draft'::"email_campaign_status" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"send_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"event_type" "email_event_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" inet,
	"user_agent" text,
	"country_code" varchar(2),
	"region" text,
	"city" text,
	"email_client" text,
	"is_mobile" boolean,
	"metadata" jsonb,
	"is_duplicate" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events_hourly" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"campaign_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"hour_bucket" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_link_stats" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"campaign_id" uuid NOT NULL,
	"destination_url" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"unique_click_count" integer DEFAULT 0 NOT NULL,
	"first_clicked_at" timestamp with time zone,
	"last_clicked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"name" text NOT NULL,
	"campaign_ids" jsonb DEFAULT '[]' NOT NULL,
	"metrics" jsonb NOT NULL,
	"format" "email_report_format" DEFAULT 'csv'::"email_report_format" NOT NULL,
	"cron_expression" text NOT NULL,
	"recipient_email" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_reports" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"status" "email_report_status" DEFAULT 'pending'::"email_report_status" NOT NULL,
	"request" jsonb NOT NULL,
	"error" text,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"campaign_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"status" "email_send_status" DEFAULT 'queued'::"email_send_status" NOT NULL,
	"sent_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppression_list" (
	"email" text PRIMARY KEY,
	"reason" "email_suppression_reason" NOT NULL,
	"suppressed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"send_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "email_tracking_tokens" (
	"token" varchar(32) PRIMARY KEY,
	"send_id" uuid NOT NULL,
	"event_type" "email_tracking_event_type" NOT NULL,
	"destination" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"webhook_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_retry_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]' NOT NULL,
	"secret" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dead_letter_events" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"job_type" text NOT NULL,
	"dedup_key" text,
	"correlation_id" text,
	"provider" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error" text NOT NULL,
	"attempts" integer NOT NULL,
	"first_failed_at" timestamp with time zone NOT NULL,
	"dead_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replayed_at" timestamp with time zone,
	"replay_job_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "job_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"dedup_key" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"correlation_id" text,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"job_type" text NOT NULL,
	"dedup_key" text,
	"correlation_id" text,
	"provider" text NOT NULL,
	"outcome" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"latency_ms" integer,
	"error" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "queue_operation_audit" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"operation" text NOT NULL,
	"target_id" text,
	"actor" text,
	"approval_id" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduler_registry" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"schedule_key" text NOT NULL,
	"cron_expr" text NOT NULL,
	"job_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"auto_disabled_at" timestamp with time zone,
	"auto_disabled_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"organization_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"label_singular" varchar(100) NOT NULL,
	"type" "taxonomy_type" DEFAULT 'custom'::"taxonomy_type" NOT NULL,
	"description" text,
	"is_hierarchical" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"applicable_entity_types" jsonb DEFAULT '["post"]' NOT NULL,
	"show_in_menu" boolean DEFAULT true NOT NULL,
	"show_in_rest" boolean DEFAULT true NOT NULL,
	"capabilities" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "term_meta" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"term_id" uuid NOT NULL,
	"meta_key" varchar(255) NOT NULL,
	"meta_value" text,
	"meta_value_json" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.uuidv7(),
	"taxonomy_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"parent_id" uuid,
	"description" text,
	"count" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"meta_title" varchar(500),
	"meta_description" text,
	"featured_image_url" varchar(500),
	"color" varchar(7),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" ("slug");--> statement-breakpoint
CREATE INDEX "organizationRole_organizationId_idx" ON "organization_role" ("organization_id");--> statement-breakpoint
CREATE INDEX "organizationRole_role_idx" ON "organization_role" ("role");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "team_organizationId_idx" ON "team" ("organization_id");--> statement-breakpoint
CREATE INDEX "teamMember_teamId_idx" ON "team_member" ("team_id");--> statement-breakpoint
CREATE INDEX "teamMember_userId_idx" ON "team_member" ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" ("user_id");--> statement-breakpoint
CREATE INDEX "comment_flags_comment_idx" ON "comment_flags" ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_flags_user_idx" ON "comment_flags" ("user_id");--> statement-breakpoint
CREATE INDEX "comment_flags_resolved_idx" ON "comment_flags" ("is_resolved");--> statement-breakpoint
CREATE INDEX "comment_flags_created_idx" ON "comment_flags" ("created_at");--> statement-breakpoint
CREATE INDEX "comment_meta_comment_idx" ON "comment_meta" ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_meta_key_idx" ON "comment_meta" ("meta_key");--> statement-breakpoint
CREATE INDEX "comment_meta_comment_key_idx" ON "comment_meta" ("comment_id","meta_key");--> statement-breakpoint
CREATE INDEX "comment_subscriptions_post_idx" ON "comment_subscriptions" ("post_id");--> statement-breakpoint
CREATE INDEX "comment_subscriptions_user_idx" ON "comment_subscriptions" ("user_id");--> statement-breakpoint
CREATE INDEX "comment_subscriptions_email_idx" ON "comment_subscriptions" ("email");--> statement-breakpoint
CREATE INDEX "comment_subscriptions_active_idx" ON "comment_subscriptions" ("is_active");--> statement-breakpoint
CREATE INDEX "comment_subscriptions_token_idx" ON "comment_subscriptions" ("unsubscribe_token");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_subscriptions_post_email_idx" ON "comment_subscriptions" ("post_id","email");--> statement-breakpoint
CREATE INDEX "comment_votes_comment_idx" ON "comment_votes" ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_votes_user_idx" ON "comment_votes" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_votes_comment_user_idx" ON "comment_votes" ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" ("post_id");--> statement-breakpoint
CREATE INDEX "comments_org_idx" ON "comments" ("organization_id");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" ("user_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" ("status");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_email_idx" ON "comments" ("author_email");--> statement-breakpoint
CREATE INDEX "comments_deleted_idx" ON "comments" ("deleted_at");--> statement-breakpoint
CREATE INDEX "comments_created_idx" ON "comments" ("created_at");--> statement-breakpoint
CREATE INDEX "comments_post_status_idx" ON "comments" ("post_id","status");--> statement-breakpoint
CREATE INDEX "comments_post_created_idx" ON "comments" ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_status_created_idx" ON "comments" ("status","created_at");--> statement-breakpoint
CREATE INDEX "comments_search_vector_idx" ON "comments" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "post_media_attachments_post_media_idx" ON "post_media_attachments" ("post_id","media_id");--> statement-breakpoint
CREATE INDEX "post_media_attachments_post_idx" ON "post_media_attachments" ("post_id");--> statement-breakpoint
CREATE INDEX "post_media_attachments_media_idx" ON "post_media_attachments" ("media_id");--> statement-breakpoint
CREATE INDEX "post_media_attachments_org_idx" ON "post_media_attachments" ("organization_id");--> statement-breakpoint
CREATE INDEX "post_meta_post_idx" ON "post_meta" ("post_id");--> statement-breakpoint
CREATE INDEX "post_meta_key_idx" ON "post_meta" ("meta_key");--> statement-breakpoint
CREATE INDEX "post_meta_post_key_idx" ON "post_meta" ("post_id","meta_key");--> statement-breakpoint
CREATE INDEX "post_relationships_post_idx" ON "post_relationships" ("post_id");--> statement-breakpoint
CREATE INDEX "post_relationships_related_idx" ON "post_relationships" ("related_post_id");--> statement-breakpoint
CREATE INDEX "post_relationships_type_idx" ON "post_relationships" ("relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "post_relationships_unique" ON "post_relationships" ("post_id","related_post_id","relationship_type");--> statement-breakpoint
CREATE INDEX "post_revisions_post_idx" ON "post_revisions" ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_revisions_post_rev_num_idx" ON "post_revisions" ("post_id","revision_number");--> statement-breakpoint
CREATE INDEX "post_revisions_author_idx" ON "post_revisions" ("author_id");--> statement-breakpoint
CREATE INDEX "post_revisions_created_idx" ON "post_revisions" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_org_idx" ON "post" ("organization_id","slug") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "posts_org_idx" ON "post" ("organization_id");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "post" ("author_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "post" ("status");--> statement-breakpoint
CREATE INDEX "posts_type_idx" ON "post" ("type");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "post" ("published_at");--> statement-breakpoint
CREATE INDEX "posts_scheduled_idx" ON "post" ("scheduled_for");--> statement-breakpoint
CREATE INDEX "posts_parent_idx" ON "post" ("parent_id");--> statement-breakpoint
CREATE INDEX "posts_revision_idx" ON "post" ("revision_of");--> statement-breakpoint
CREATE INDEX "posts_deleted_idx" ON "post" ("deleted_at");--> statement-breakpoint
CREATE INDEX "posts_org_status_type_idx" ON "post" ("organization_id","status","type");--> statement-breakpoint
CREATE INDEX "posts_sticky_published_idx" ON "post" ("is_sticky","published_at");--> statement-breakpoint
CREATE INDEX "posts_search_vector_idx" ON "post" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "post_term_relationships_post_term_idx" ON "post_term_relationships" ("post_id","term_id");--> statement-breakpoint
CREATE INDEX "post_term_relationships_post_idx" ON "post_term_relationships" ("post_id");--> statement-breakpoint
CREATE INDEX "post_term_relationships_term_idx" ON "post_term_relationships" ("term_id");--> statement-breakpoint
CREATE INDEX "post_term_relationships_org_idx" ON "post_term_relationships" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "options_global_name_idx" ON "blog_options" ("option_name") WHERE "scope" = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX "options_org_name_idx" ON "blog_options" ("organization_id","option_name") WHERE "scope" = 'organization';--> statement-breakpoint
CREATE UNIQUE INDEX "options_user_name_idx" ON "blog_options" ("user_id","option_name") WHERE "scope" = 'user';--> statement-breakpoint
CREATE INDEX "options_scope_idx" ON "blog_options" ("scope");--> statement-breakpoint
CREATE INDEX "options_org_idx" ON "blog_options" ("organization_id");--> statement-breakpoint
CREATE INDEX "options_user_idx" ON "blog_options" ("user_id");--> statement-breakpoint
CREATE INDEX "options_autoload_idx" ON "blog_options" ("autoload");--> statement-breakpoint
CREATE INDEX "options_category_idx" ON "blog_options" ("category");--> statement-breakpoint
CREATE INDEX "preview_tokens_post_idx" ON "preview_tokens" ("post_id");--> statement-breakpoint
CREATE INDEX "preview_tokens_token_idx" ON "preview_tokens" ("token");--> statement-breakpoint
CREATE INDEX "preview_tokens_expires_idx" ON "preview_tokens" ("expires_at");--> statement-breakpoint
CREATE INDEX "preview_tokens_created_by_idx" ON "preview_tokens" ("created_by");--> statement-breakpoint
CREATE INDEX "idx_contact_requests_search_vector" ON "contact_requests" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "contact_addresses_contact_idx" ON "contact_addresses" ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_addresses_city_idx" ON "contact_addresses" ("city");--> statement-breakpoint
CREATE INDEX "contact_addresses_postal_idx" ON "contact_addresses" ("postal_code");--> statement-breakpoint
CREATE UNIQUE INDEX "primary_address_unique_idx" ON "contact_addresses" ("contact_id","type") WHERE "is_primary" = true;--> statement-breakpoint
CREATE INDEX "contact_emails_contact_idx" ON "contact_emails" ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_emails_contact_primary_idx" ON "contact_emails" ("contact_id","is_primary");--> statement-breakpoint
CREATE INDEX "contact_emails_email_idx" ON "contact_emails" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "primary_email_unique_idx" ON "contact_emails" ("email") WHERE "is_primary" = true;--> statement-breakpoint
CREATE INDEX "contact_phones_contact_idx" ON "contact_phones" ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_phones_contact_primary_idx" ON "contact_phones" ("contact_id","is_primary");--> statement-breakpoint
CREATE INDEX "contact_phones_phone_idx" ON "contact_phones" ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "primary_phone_unique_idx" ON "contact_phones" ("phone_number") WHERE "is_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_contact_search_search_vector" ON "contact_search" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_geo_cache_key" ON "geo_cache" ("cache_key");--> statement-breakpoint
CREATE INDEX "idx_geo_cache_type" ON "geo_cache" ("type");--> statement-breakpoint
CREATE INDEX "idx_geo_cache_expires" ON "geo_cache" ("expires_at");--> statement-breakpoint
CREATE INDEX "media_organization_id_idx" ON "media" ("organization_id");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media" ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_mime_type_idx" ON "media" ("mime_type");--> statement-breakpoint
CREATE INDEX "media_folder_id_idx" ON "media" ("folder_id");--> statement-breakpoint
CREATE INDEX "media_deleted_at_idx" ON "media" ("deleted_at");--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" ("created_at");--> statement-breakpoint
CREATE INDEX "media_storage_key_idx" ON "media" ("storage_key");--> statement-breakpoint
CREATE INDEX "media_search_vector_idx" ON "media" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "media_folders_organization_id_idx" ON "media_folders" ("organization_id");--> statement-breakpoint
CREATE INDEX "media_folders_parent_id_idx" ON "media_folders" ("parent_id");--> statement-breakpoint
CREATE INDEX "media_folders_slug_idx" ON "media_folders" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_folders_unique_slug_idx" ON "media_folders" ("organization_id","parent_id","slug");--> statement-breakpoint
CREATE INDEX "media_variants_media_id_idx" ON "media_variants" ("media_id");--> statement-breakpoint
CREATE INDEX "media_variants_variant_name_idx" ON "media_variants" ("variant_name");--> statement-breakpoint
CREATE UNIQUE INDEX "media_variants_unique_idx" ON "media_variants" ("media_id","variant_name");--> statement-breakpoint
CREATE UNIQUE INDEX "media_options_global_name_idx" ON "media_options" ("option_name") WHERE "scope" = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX "media_options_org_name_idx" ON "media_options" ("organization_id","option_name") WHERE "scope" = 'organization';--> statement-breakpoint
CREATE UNIQUE INDEX "media_options_user_name_idx" ON "media_options" ("user_id","option_name") WHERE "scope" = 'user';--> statement-breakpoint
CREATE INDEX "media_options_scope_idx" ON "media_options" ("scope");--> statement-breakpoint
CREATE INDEX "media_options_org_idx" ON "media_options" ("organization_id");--> statement-breakpoint
CREATE INDEX "media_options_user_idx" ON "media_options" ("user_id");--> statement-breakpoint
CREATE INDEX "media_options_autoload_idx" ON "media_options" ("autoload");--> statement-breakpoint
CREATE INDEX "media_options_category_idx" ON "media_options" ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "media_term_relationships_media_term_idx" ON "media_term_relationships" ("media_id","term_id");--> statement-breakpoint
CREATE INDEX "media_term_relationships_media_idx" ON "media_term_relationships" ("media_id");--> statement-breakpoint
CREATE INDEX "media_term_relationships_term_idx" ON "media_term_relationships" ("term_id");--> statement-breakpoint
CREATE INDEX "idx_lookups_name" ON "lookups" ("lookup_name","originating_system_name");--> statement-breakpoint
CREATE INDEX "idx_lookups_sync" ON "lookups" ("originating_system_name","modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_lookups_search_vector" ON "lookups" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_resource_record_key" ON "mls_media" ("resource_record_key");--> statement-breakpoint
CREATE INDEX "idx_media_modification_timestamp" ON "mls_media" ("media_modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_mls_media_updated_at" ON "mls_media" ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_mls_media_deleted_at" ON "mls_media" ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_mls_media_media_id" ON "mls_media" ("media_id");--> statement-breakpoint
CREATE INDEX "idx_permission" ON "mls_media" ("permission");--> statement-breakpoint
CREATE INDEX "idx_media_listing_primary" ON "mls_media" ("resource_record_key","preferred_photo_yn","order");--> statement-breakpoint
CREATE INDEX "idx_mls_media_candidate_sort" ON "mls_media" ("updated_at","media_key");--> statement-breakpoint
CREATE INDEX "idx_mls_media_listing_candidate_sort" ON "mls_media" ("resource_record_key","updated_at","media_key");--> statement-breakpoint
CREATE INDEX "idx_image_size_description" ON "mls_media" ("image_size_description");--> statement-breakpoint
CREATE INDEX "idx_media_search_vector" ON "mls_media" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_members_sync" ON "members" ("originating_system_name","modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_members_name" ON "members" ("member_full_name");--> statement-breakpoint
CREATE INDEX "idx_members_key" ON "members" ("member_key");--> statement-breakpoint
CREATE INDEX "idx_members_office" ON "members" ("office_key");--> statement-breakpoint
CREATE INDEX "idx_members_search_vector" ON "members" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_offices_sync" ON "offices" ("originating_system_name","modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_offices_name" ON "offices" ("office_name");--> statement-breakpoint
CREATE INDEX "idx_offices_key" ON "offices" ("office_key");--> statement-breakpoint
CREATE INDEX "idx_offices_search_vector" ON "offices" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_open_houses_listing_key" ON "open_houses" ("listing_key");--> statement-breakpoint
CREATE INDEX "idx_open_houses_date" ON "open_houses" ("open_house_date");--> statement-breakpoint
CREATE INDEX "idx_open_houses_sync" ON "open_houses" ("originating_system_name","modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_open_houses_missing_listing_active" ON "open_houses" ("originating_system_name","open_house_key") WHERE "listing_key" IS NULL AND "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_open_houses_search_vector" ON "open_houses" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_properties_property_type" ON "properties" ("property_type") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_geo" ON "properties" ("latitude","longitude") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_h3_r8_status" ON "properties" ("h3_r8","standard_status") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_h3_r7_status" ON "properties" ("h3_r7","standard_status") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_featured_status" ON "properties" ("featured_listing_yn","standard_status","listing_key") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_sync" ON "properties" ("originating_system_name","modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_properties_visible_status_sort" ON "properties" ("standard_status","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_office_status_sort" ON "properties" ("list_office_mls_id","standard_status","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_member_status_sort" ON "properties" ("list_agent_mls_id","standard_status","on_market_date","modification_timestamp","listing_key") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_search_vector" ON "properties" USING gin ("search_vector") WHERE "mlg_can_view" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_properties_visible_active_geo_search_vector" ON "properties" USING gin ("search_vector") WHERE "mlg_can_view" = true
          AND "deleted_at" IS NULL
          AND "standard_status" IN ('Active', 'ActiveUnderContract', 'ComingSoon')
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_property_rooms_listing_key" ON "property_rooms" ("listing_key");--> statement-breakpoint
CREATE INDEX "idx_property_rooms_search_vector" ON "property_rooms" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_property_unit_types_listing_key" ON "property_unit_types" ("listing_key");--> statement-breakpoint
CREATE INDEX "idx_property_unit_types_search_vector" ON "property_unit_types" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mls_sync_cursors_resource_unique" ON "mls_sync_cursors" ("resource","originating_system_name");--> statement-breakpoint
CREATE INDEX "email_bounces_send_idx" ON "email_bounces" ("send_id");--> statement-breakpoint
CREATE INDEX "email_bounces_next_retry_idx" ON "email_bounces" ("next_retry_at");--> statement-breakpoint
CREATE INDEX "email_campaigns_created_id_idx" ON "email_campaigns" ("created_at","id");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_created_id_idx" ON "email_campaigns" ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "email_events_send_type_occurred_idx" ON "email_events" ("send_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "email_events_campaign_type_occurred_idx" ON "email_events" ("campaign_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "email_events_campaign_occurred_id_idx" ON "email_events" ("campaign_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "email_events_campaign_type_occurred_id_idx" ON "email_events" ("campaign_id","event_type","occurred_at","id");--> statement-breakpoint
CREATE INDEX "email_events_occurred_idx" ON "email_events" ("occurred_at");--> statement-breakpoint
CREATE INDEX "email_events_campaign_country_open_click_idx" ON "email_events" ("campaign_id","country_code") WHERE "is_duplicate" = false AND "country_code" IS NOT NULL AND "event_type" IN ('open', 'click');--> statement-breakpoint
CREATE INDEX "email_events_campaign_client_mobile_open_click_idx" ON "email_events" ("campaign_id","email_client","is_mobile") WHERE "is_duplicate" = false AND "event_type" IN ('open', 'click');--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_hourly_campaign_event_hour_unique" ON "email_events_hourly" ("campaign_id","event_type","hour_bucket");--> statement-breakpoint
CREATE INDEX "email_events_hourly_campaign_bucket_idx" ON "email_events_hourly" ("campaign_id","hour_bucket");--> statement-breakpoint
CREATE UNIQUE INDEX "email_link_stats_campaign_destination_unique" ON "email_link_stats" ("campaign_id","destination_url");--> statement-breakpoint
CREATE INDEX "email_link_stats_campaign_idx" ON "email_link_stats" ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_reports_status_created_idx" ON "email_reports" ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_sends_campaign_idx" ON "email_sends" ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_sends_recipient_sent_idx" ON "email_sends" ("recipient_email","sent_at");--> statement-breakpoint
CREATE INDEX "email_sends_status_idx" ON "email_sends" ("status");--> statement-breakpoint
CREATE INDEX "email_suppression_list_suppressed_email_idx" ON "email_suppression_list" ("suppressed_at","email");--> statement-breakpoint
CREATE INDEX "email_tracking_tokens_send_event_idx" ON "email_tracking_tokens" ("send_id","event_type");--> statement-breakpoint
CREATE INDEX "email_tracking_tokens_expires_idx" ON "email_tracking_tokens" ("expires_at");--> statement-breakpoint
CREATE INDEX "email_webhook_deliveries_webhook_delivered_idx" ON "email_webhook_deliveries" ("webhook_id","delivered_at");--> statement-breakpoint
CREATE INDEX "email_webhook_deliveries_next_retry_idx" ON "email_webhook_deliveries" ("next_retry_at");--> statement-breakpoint
CREATE INDEX "dle_job_type_idx" ON "dead_letter_events" ("job_type","dead_at");--> statement-breakpoint
CREATE INDEX "dle_correlation_idx" ON "dead_letter_events" ("correlation_id");--> statement-breakpoint
CREATE INDEX "dle_replayed_at_idx" ON "dead_letter_events" ("replayed_at");--> statement-breakpoint
CREATE INDEX "dle_dedup_key_idx" ON "dead_letter_events" ("dedup_key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_idempotency_dedup_key_unique" ON "job_idempotency" ("dedup_key");--> statement-breakpoint
CREATE INDEX "job_idempotency_job_type_idx" ON "job_idempotency" ("job_type","status");--> statement-breakpoint
CREATE INDEX "job_idempotency_created_idx" ON "job_idempotency" ("created_at");--> statement-breakpoint
CREATE INDEX "job_idempotency_status_created_idx" ON "job_idempotency" ("status","created_at");--> statement-breakpoint
CREATE INDEX "job_runs_job_type_idx" ON "job_runs" ("job_type","outcome","started_at");--> statement-breakpoint
CREATE INDEX "job_runs_started_at_idx" ON "job_runs" ("started_at");--> statement-breakpoint
CREATE INDEX "job_runs_correlation_idx" ON "job_runs" ("correlation_id");--> statement-breakpoint
CREATE INDEX "queue_operation_audit_operation_created_idx" ON "queue_operation_audit" ("operation","created_at");--> statement-breakpoint
CREATE INDEX "queue_operation_audit_target_idx" ON "queue_operation_audit" ("target_id");--> statement-breakpoint
CREATE INDEX "queue_operation_audit_approval_idx" ON "queue_operation_audit" ("approval_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduler_registry_schedule_key_unique" ON "scheduler_registry" ("schedule_key");--> statement-breakpoint
CREATE INDEX "scheduler_registry_job_type_idx" ON "scheduler_registry" ("job_type");--> statement-breakpoint
CREATE INDEX "scheduler_registry_enabled_idx" ON "scheduler_registry" ("enabled");--> statement-breakpoint
CREATE INDEX "scheduler_registry_enabled_job_type_idx" ON "scheduler_registry" ("enabled","job_type");--> statement-breakpoint
CREATE INDEX "scheduler_registry_enabled_failure_idx" ON "scheduler_registry" ("enabled","consecutive_failures");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomies_org_slug_idx" ON "taxonomies" ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "taxonomies_org_idx" ON "taxonomies" ("organization_id");--> statement-breakpoint
CREATE INDEX "taxonomies_type_idx" ON "taxonomies" ("type");--> statement-breakpoint
CREATE INDEX "term_meta_term_idx" ON "term_meta" ("term_id");--> statement-breakpoint
CREATE INDEX "term_meta_key_idx" ON "term_meta" ("meta_key");--> statement-breakpoint
CREATE INDEX "term_meta_term_key_idx" ON "term_meta" ("term_id","meta_key");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_taxonomy_org_slug_idx" ON "terms" ("taxonomy_id","organization_id","slug");--> statement-breakpoint
CREATE INDEX "terms_taxonomy_idx" ON "terms" ("taxonomy_id");--> statement-breakpoint
CREATE INDEX "terms_org_idx" ON "terms" ("organization_id");--> statement-breakpoint
CREATE INDEX "terms_parent_idx" ON "terms" ("parent_id");--> statement-breakpoint
CREATE INDEX "terms_slug_idx" ON "terms" ("slug");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "comment_meta" ADD CONSTRAINT "comment_meta_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_subscriptions" ADD CONSTRAINT "comment_subscriptions_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_subscriptions" ADD CONSTRAINT "comment_subscriptions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_user_id_fkey" FOREIGN KEY ("moderated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_media_attachments" ADD CONSTRAINT "post_media_attachments_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media_attachments" ADD CONSTRAINT "post_media_attachments_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_media_attachments" ADD CONSTRAINT "post_media_attachments_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_meta" ADD CONSTRAINT "post_meta_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_relationships" ADD CONSTRAINT "post_relationships_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_relationships" ADD CONSTRAINT "post_relationships_related_post_id_post_id_fkey" FOREIGN KEY ("related_post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_featured_image_id_media_id_fkey" FOREIGN KEY ("featured_image_id") REFERENCES "media"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_featured_media_id_media_id_fkey" FOREIGN KEY ("featured_media_id") REFERENCES "media"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "post_term_relationships" ADD CONSTRAINT "post_term_relationships_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_term_relationships" ADD CONSTRAINT "post_term_relationships_term_id_terms_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "post_term_relationships" ADD CONSTRAINT "post_term_relationships_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blog_options" ADD CONSTRAINT "blog_options_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id");--> statement-breakpoint
ALTER TABLE "blog_options" ADD CONSTRAINT "blog_options_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_post_id_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "contact_addresses" ADD CONSTRAINT "contact_addresses_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_phones" ADD CONSTRAINT "contact_phones_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_social_profiles" ADD CONSTRAINT "contact_social_profiles_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_websites" ADD CONSTRAINT "contact_websites_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_companies" ADD CONSTRAINT "contact_companies_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_companies" ADD CONSTRAINT "contact_companies_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_newsletters" ADD CONSTRAINT "contact_newsletters_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_newsletters" ADD CONSTRAINT "contact_newsletters_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_search" ADD CONSTRAINT "contact_search_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_terms_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "terms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_options" ADD CONSTRAINT "media_options_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id");--> statement-breakpoint
ALTER TABLE "media_options" ADD CONSTRAINT "media_options_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_term_relationships" ADD CONSTRAINT "media_term_relationships_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_term_relationships" ADD CONSTRAINT "media_term_relationships_term_id_terms_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "media_term_relationships" ADD CONSTRAINT "media_term_relationships_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mls_media" ADD CONSTRAINT "mls_media_media_id_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "open_houses" ADD CONSTRAINT "open_houses_listing_key_properties_listing_key_fkey" FOREIGN KEY ("listing_key") REFERENCES "properties"("listing_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_rooms" ADD CONSTRAINT "property_rooms_listing_key_properties_listing_key_fkey" FOREIGN KEY ("listing_key") REFERENCES "properties"("listing_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_unit_types" ADD CONSTRAINT "property_unit_types_listing_key_properties_listing_key_fkey" FOREIGN KEY ("listing_key") REFERENCES "properties"("listing_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "email_bounces" ADD CONSTRAINT "email_bounces_send_id_email_sends_id_fkey" FOREIGN KEY ("send_id") REFERENCES "email_sends"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_campaign_stats" ADD CONSTRAINT "email_campaign_stats_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_send_id_email_sends_id_fkey" FOREIGN KEY ("send_id") REFERENCES "email_sends"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_events_hourly" ADD CONSTRAINT "email_events_hourly_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_link_stats" ADD CONSTRAINT "email_link_stats_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_suppression_list" ADD CONSTRAINT "email_suppression_list_send_id_email_sends_id_fkey" FOREIGN KEY ("send_id") REFERENCES "email_sends"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "email_tracking_tokens" ADD CONSTRAINT "email_tracking_tokens_send_id_email_sends_id_fkey" FOREIGN KEY ("send_id") REFERENCES "email_sends"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_webhook_deliveries" ADD CONSTRAINT "email_webhook_deliveries_webhook_id_email_webhooks_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "email_webhooks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_webhook_deliveries" ADD CONSTRAINT "email_webhook_deliveries_event_id_email_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "taxonomies" ADD CONSTRAINT "taxonomies_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "term_meta" ADD CONSTRAINT "term_meta_term_id_terms_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_taxonomy_id_taxonomies_id_fkey" FOREIGN KEY ("taxonomy_id") REFERENCES "taxonomies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;
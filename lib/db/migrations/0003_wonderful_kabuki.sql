CREATE TABLE "job_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ats_type" text NOT NULL,
	"board_token" text,
	"company_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_job_id" text NOT NULL,
	"ats_type" text,
	"apply_url" text NOT NULL,
	"source_url" text NOT NULL,
	"attribution_label" text,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"remote_type" text,
	"description_text" text NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"salary_predicted" boolean DEFAULT false NOT NULL,
	"posted_at" timestamp with time zone,
	"language" text,
	"content_hash" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_sources_ats_board_idx" ON "job_sources" USING btree ("ats_type","board_token");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_source_job_unique_idx" ON "jobs" USING btree ("source","source_job_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");
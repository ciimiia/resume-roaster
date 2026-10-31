CREATE TABLE "blog_posts" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_fa" text,
	"excerpt" text NOT NULL,
	"excerpt_fa" text,
	"date" date NOT NULL,
	"read_time" integer NOT NULL,
	"tag" text NOT NULL,
	"content" jsonb NOT NULL,
	"cover_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"letter" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"date" date NOT NULL,
	"path" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_visits_date_path_pk" PRIMARY KEY("date","path")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_results" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"result" jsonb NOT NULL,
	"user_id" uuid,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_results" ADD CONSTRAINT "shared_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cover_letters_user_idx" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shared_results_user_idx" ON "shared_results" USING btree ("user_id");
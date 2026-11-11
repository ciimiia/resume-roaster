CREATE TABLE "tailored_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"job_text_hash" text,
	"job_title_snapshot" text NOT NULL,
	"company_snapshot" text,
	"profile_approved_at" timestamp with time zone NOT NULL,
	"tailored_profile" jsonb NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ats_coverage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "tailored_resume_id" uuid;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tailored_resumes_user_idx" ON "tailored_resumes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_tailored_resume_id_tailored_resumes_id_fk" FOREIGN KEY ("tailored_resume_id") REFERENCES "public"."tailored_resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
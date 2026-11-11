CREATE TABLE "university_interest_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"consent_accepted_at" timestamp with time zone NOT NULL,
	"countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level" text,
	"field" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

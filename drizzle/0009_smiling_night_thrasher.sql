CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp DEFAULT NULL::timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election" uuid NOT NULL,
	"office" uuid NOT NULL,
	"candidate" uuid NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"calculated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faculties" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "departments" CASCADE;--> statement-breakpoint
DROP TABLE "faculties" CASCADE;--> statement-breakpoint
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_id_unique";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_id_unique";--> statement-breakpoint
ALTER TABLE "elections" DROP CONSTRAINT "elections_id_unique";--> statement-breakpoint
ALTER TABLE "issuances" DROP CONSTRAINT "issuances_id_unique";--> statement-breakpoint
ALTER TABLE "admins" DROP CONSTRAINT "admins_id_unique";--> statement-breakpoint
ALTER TABLE "masterlist" DROP CONSTRAINT "masterlist_id_unique";--> statement-breakpoint
ALTER TABLE "offices" DROP CONSTRAINT "offices_id_unique";--> statement-breakpoint
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_id_unique";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_id_unique";--> statement-breakpoint
ALTER TABLE "tokens" DROP CONSTRAINT "tokens_id_unique";--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_id_unique";--> statement-breakpoint
ALTER TABLE "voters" DROP CONSTRAINT "voters_id_unique";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_faculty_faculties_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_department_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "faculty" SET DATA TYPE "public"."faculty_name" USING "faculty"::"public"."faculty_name";--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "department" SET DATA TYPE "public"."department_name" USING "department"::"public"."department_name";--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "domain_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "voter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issuances" ADD COLUMN "token_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "admin_id" uuid;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_office_offices_id_fk" FOREIGN KEY ("office") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_candidate_candidates_id_fk" FOREIGN KEY ("candidate") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_calculated_by_admins_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
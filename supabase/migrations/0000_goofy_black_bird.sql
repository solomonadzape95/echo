DROP TYPE IF EXISTS "public"."election_status" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."election_type" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."candidates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."classes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."departments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."elections" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."faculties" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."issuances" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."offices" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."receipts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."tokens" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."votes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."voters" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."election_status" AS ENUM('pending', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."election_type" AS ENUM('class', 'department', 'faculty');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office" uuid NOT NULL,
	"voter" uuid NOT NULL,
	"quote" text DEFAULT '',
	"manifesto" text DEFAULT '',
	"image" varchar(255) DEFAULT '',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" varchar(255) NOT NULL,
	"faculty" uuid NOT NULL,
	"department" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"faculty" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "election_type" NOT NULL,
	"status" "election_status" DEFAULT 'pending' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"domain_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "elections_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faculties_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "issuances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election" uuid NOT NULL,
	"voter" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issuances_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"election" uuid NOT NULL,
	"depends_on" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offices_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_hash" varchar(255) NOT NULL,
	"election" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"used_at" timestamp DEFAULT NULL::timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prev_hash" varchar(255) NOT NULL,
	"current_hash" varchar(255) NOT NULL,
	"token_id" varchar(255) NOT NULL,
	"election" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"reg_number" varchar(255) NOT NULL,
	"class" uuid NOT NULL,
	"password" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voters_id_unique" UNIQUE("id"),
	CONSTRAINT "voters_username_unique" UNIQUE("username"),
	CONSTRAINT "voters_reg_number_unique" UNIQUE("reg_number")
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_office_offices_id_fk" FOREIGN KEY ("office") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_voter_voters_id_fk" FOREIGN KEY ("voter") REFERENCES "public"."voters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_faculty_faculties_id_fk" FOREIGN KEY ("faculty") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_department_departments_id_fk" FOREIGN KEY ("department") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_faculties_id_fk" FOREIGN KEY ("faculty") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuances" ADD CONSTRAINT "issuances_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuances" ADD CONSTRAINT "issuances_voter_voters_id_fk" FOREIGN KEY ("voter") REFERENCES "public"."voters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voters" ADD CONSTRAINT "voters_class_classes_id_fk" FOREIGN KEY ("class") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
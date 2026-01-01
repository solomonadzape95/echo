-- Create results table if it doesn't exist
-- Run this manually if drizzle-kit push didn't create it

CREATE TABLE IF NOT EXISTS "results" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "election" uuid NOT NULL,
    "office" uuid NOT NULL,
    "candidate" uuid NOT NULL,
    "vote_count" integer NOT NULL DEFAULT 0,
    "percentage" decimal(5, 2) NOT NULL DEFAULT '0.00',
    "calculated_at" timestamp NOT NULL DEFAULT now(),
    "calculated_by" uuid,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "results_election_elections_id_fk" FOREIGN KEY ("election") REFERENCES "public"."elections"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "results_office_offices_id_fk" FOREIGN KEY ("office") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "results_candidate_candidates_id_fk" FOREIGN KEY ("candidate") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "results_calculated_by_admins_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action
);


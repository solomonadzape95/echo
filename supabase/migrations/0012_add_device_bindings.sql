-- Device lock: one account per device and one device per account.
--
-- Clients send a stable device identifier (Android: ANDROID_ID, iOS: keychain
-- UUID / identifierForVendor). Only sha256(pepper + id) is stored. The raw
-- identifier never reaches the database and is never joined to ballot data.

CREATE TABLE IF NOT EXISTS "device_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid NOT NULL,
	"device_id_hash" varchar(64) NOT NULL,
	"platform" varchar(32) DEFAULT 'unknown' NOT NULL,
	"label" varchar(160),
	"bound_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_bindings" ADD CONSTRAINT "device_bindings_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "device_bindings_voter_id_unique" ON "device_bindings" USING btree ("voter_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "device_bindings_device_id_hash_unique" ON "device_bindings" USING btree ("device_id_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_bindings_device_id_hash_idx" ON "device_bindings" USING btree ("device_id_hash");

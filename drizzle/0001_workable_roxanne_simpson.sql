CREATE TABLE "masterlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"reg_no" varchar(255) NOT NULL,
	"class" uuid NOT NULL,
	"activated" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "masterlist_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "offices" ALTER COLUMN "depends_on" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "masterlist" ADD CONSTRAINT "masterlist_class_classes_id_fk" FOREIGN KEY ("class") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
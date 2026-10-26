ALTER TABLE "voters" RENAME COLUMN "class" TO "class_id";--> statement-breakpoint
ALTER TABLE "voters" DROP CONSTRAINT "voters_class_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "voters" ADD CONSTRAINT "voters_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
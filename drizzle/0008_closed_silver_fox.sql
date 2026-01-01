ALTER TABLE "voters" RENAME COLUMN "class_id" TO "class";--> statement-breakpoint
ALTER TABLE "voters" DROP CONSTRAINT "voters_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "voters" ADD CONSTRAINT "voters_class_classes_id_fk" FOREIGN KEY ("class") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "receipts" ADD COLUMN "receipt_code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "vote" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "vote_data_hash" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "receipt_hash";--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_receipt_code_unique" UNIQUE("receipt_code");
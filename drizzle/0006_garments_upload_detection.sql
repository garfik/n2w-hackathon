-- Garment: drop legacy original_image_key, add upload_id, bbox_norm, category; name nullable
-- Remove legacy garment data (no upload_id mapping). Clear references then garments.
DELETE FROM "outfit_garment";
--> statement-breakpoint
DELETE FROM "outfit_analysis";
--> statement-breakpoint
DELETE FROM "garment";
--> statement-breakpoint
ALTER TABLE "garment" DROP COLUMN IF EXISTS "original_image_key";
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'garment' AND column_name = 'upload_id') THEN
  ALTER TABLE "garment" ADD COLUMN "upload_id" text;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "garment" ADD CONSTRAINT "garment_upload_id_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'garment' AND column_name = 'bbox_norm') THEN
  ALTER TABLE "garment" ADD COLUMN "bbox_norm" jsonb;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'garment' AND column_name = 'category') THEN
  ALTER TABLE "garment" ADD COLUMN "category" text;
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "garment" ALTER COLUMN "name" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "garment" ALTER COLUMN "upload_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_user_id_idx" ON "garment" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_category_idx" ON "garment" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_upload_id_idx" ON "garment" USING btree ("upload_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "garment_detection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"upload_id" text NOT NULL,
	"bbox_norm" jsonb NOT NULL,
	"category_guess" text,
	"label_guess" text,
	"garment_profile_json" jsonb,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "garment_detection" ADD CONSTRAINT "garment_detection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "garment_detection" ADD CONSTRAINT "garment_detection_upload_id_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_detection_user_id_idx" ON "garment_detection" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_detection_upload_id_idx" ON "garment_detection" USING btree ("upload_id");

CREATE TYPE "public"."generation_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "outfit_item" (
	"id" text PRIMARY KEY NOT NULL,
	"outfit_id" text NOT NULL,
	"garment_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tryon" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avatar_id" text NOT NULL,
	"tryon_key" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"image_upload_id" text,
	"error_code" text,
	"error_message" text,
	"generation_started_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outfit_analysis" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outfit_garment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tryon_result" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "outfit_analysis" CASCADE;--> statement-breakpoint
DROP TABLE "outfit_garment" CASCADE;--> statement-breakpoint
DROP TABLE "tryon_result" CASCADE;--> statement-breakpoint
ALTER TABLE "avatar" RENAME COLUMN "source_photo_key" TO "photo_upload_id";--> statement-breakpoint
ALTER TABLE "garment" RENAME COLUMN "original_image_key" TO "upload_id";--> statement-breakpoint
ALTER TABLE "garment" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "garment" ADD COLUMN "bbox_norm" jsonb;--> statement-breakpoint
ALTER TABLE "garment" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "outfit_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "tryon_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "status" "generation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "outfit" ADD COLUMN "generation_started_at" timestamp;--> statement-breakpoint
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
DO $$ BEGIN
 ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_outfit_id_outfit_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_garment_id_garment_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tryon" ADD CONSTRAINT "tryon_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tryon" ADD CONSTRAINT "tryon_avatar_id_avatar_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tryon" ADD CONSTRAINT "tryon_image_upload_id_upload_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."upload"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_detection_user_id_idx" ON "garment_detection" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_detection_upload_id_idx" ON "garment_detection" USING btree ("upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outfit_item_outfit_garment_idx" ON "outfit_item" USING btree ("outfit_id","garment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outfit_item_outfit_id_idx" ON "outfit_item" USING btree ("outfit_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tryon_user_tryon_key_idx" ON "tryon" USING btree ("user_id","tryon_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tryon_user_id_idx" ON "tryon" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tryon_avatar_id_idx" ON "tryon" USING btree ("avatar_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avatar" ADD CONSTRAINT "avatar_photo_upload_id_upload_id_fk" FOREIGN KEY ("photo_upload_id") REFERENCES "public"."upload"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "garment" ADD CONSTRAINT "garment_upload_id_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_user_id_idx" ON "garment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_category_idx" ON "garment" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "garment_upload_id_idx" ON "garment" USING btree ("upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outfit_user_outfit_key_idx" ON "outfit" USING btree ("user_id","outfit_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outfit_user_id_idx" ON "outfit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outfit_avatar_id_idx" ON "outfit" USING btree ("avatar_id");--> statement-breakpoint
ALTER TABLE "outfit" DROP COLUMN IF EXISTS "result_image_key";
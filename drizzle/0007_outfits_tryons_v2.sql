-- Migration: Replace old outfit/outfit_garment/outfit_analysis/tryon_result tables
-- with new outfit/outfit_item/tryon tables using generation_status enum and key-based caching.

-- Step 1: Drop old tables (order matters for FK constraints)
DROP TABLE IF EXISTS "outfit_garment" CASCADE;
DROP TABLE IF EXISTS "outfit_analysis" CASCADE;
DROP TABLE IF EXISTS "tryon_result" CASCADE;
DROP TABLE IF EXISTS "outfit" CASCADE;

-- Step 2: Create enum for generation status
DO $$ BEGIN
  CREATE TYPE "public"."generation_status" AS ENUM('pending', 'running', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create new outfit table
CREATE TABLE IF NOT EXISTS "outfit" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "avatar_id" text NOT NULL REFERENCES "avatar"("id") ON DELETE CASCADE,
  "occasion" text NOT NULL,
  "outfit_key" text NOT NULL,
  "tryon_key" text NOT NULL,
  "status" "generation_status" DEFAULT 'pending' NOT NULL,
  "score_json" jsonb,
  "error_code" text,
  "error_message" text,
  "generation_started_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "outfit_user_outfit_key_idx" ON "outfit" USING btree ("user_id", "outfit_key");
CREATE INDEX IF NOT EXISTS "outfit_user_id_idx" ON "outfit" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "outfit_avatar_id_idx" ON "outfit" USING btree ("avatar_id");

-- Step 4: Create outfit_item table
CREATE TABLE IF NOT EXISTS "outfit_item" (
  "id" text PRIMARY KEY NOT NULL,
  "outfit_id" text NOT NULL REFERENCES "outfit"("id") ON DELETE CASCADE,
  "garment_id" text NOT NULL REFERENCES "garment"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "outfit_item_outfit_garment_idx" ON "outfit_item" USING btree ("outfit_id", "garment_id");
CREATE INDEX IF NOT EXISTS "outfit_item_outfit_id_idx" ON "outfit_item" USING btree ("outfit_id");

-- Step 5: Create tryon table
CREATE TABLE IF NOT EXISTS "tryon" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "avatar_id" text NOT NULL REFERENCES "avatar"("id") ON DELETE CASCADE,
  "tryon_key" text NOT NULL,
  "status" "generation_status" DEFAULT 'pending' NOT NULL,
  "image_upload_id" text REFERENCES "upload"("id") ON DELETE SET NULL,
  "error_code" text,
  "error_message" text,
  "generation_started_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tryon_user_tryon_key_idx" ON "tryon" USING btree ("user_id", "tryon_key");
CREATE INDEX IF NOT EXISTS "tryon_user_id_idx" ON "tryon" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "tryon_avatar_id_idx" ON "tryon" USING btree ("avatar_id");

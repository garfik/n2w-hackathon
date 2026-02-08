ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "avatar" DROP CONSTRAINT IF EXISTS "avatar_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "avatar_analysis" DROP CONSTRAINT IF EXISTS "avatar_analysis_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "garment" DROP CONSTRAINT IF EXISTS "garment_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "garment_detection" DROP CONSTRAINT IF EXISTS "garment_detection_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "outfit" DROP CONSTRAINT IF EXISTS "outfit_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "tryon" DROP CONSTRAINT IF EXISTS "tryon_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "upload" DROP CONSTRAINT IF EXISTS "upload_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "garment_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "garment_detection_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "outfit_user_outfit_key_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "outfit_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tryon_user_tryon_key_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tryon_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "upload_user_sha256_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "upload_sha256_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "upload_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outfit_avatar_outfit_key_idx" ON "outfit" USING btree ("avatar_id","outfit_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tryon_avatar_tryon_key_idx" ON "tryon" USING btree ("avatar_id","tryon_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "upload_sha256_unique_idx" ON "upload" USING btree ("original_sha256");--> statement-breakpoint
ALTER TABLE "avatar" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "avatar_analysis" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "garment" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "garment_detection" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "outfit" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "tryon" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "upload" DROP COLUMN IF EXISTS "user_id";
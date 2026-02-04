-- Avatar: replace source_photo_key with photo_upload_id (FK to upload)
-- Requires empty avatar table or run: DELETE FROM avatar; before migrating.
ALTER TABLE "avatar" DROP COLUMN IF EXISTS "source_photo_key";
--> statement-breakpoint
ALTER TABLE "avatar" ADD COLUMN "photo_upload_id" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avatar" ADD CONSTRAINT "avatar_photo_upload_id_upload_id_fk" FOREIGN KEY ("photo_upload_id") REFERENCES "public"."upload"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "upload" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_sha256" text NOT NULL,
	"original_mime" text NOT NULL,
	"original_size_bytes" bigint NOT NULL,
	"stored_key" text NOT NULL,
	"stored_mime" text DEFAULT 'image/jpeg' NOT NULL,
	"stored_size_bytes" bigint NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upload" ADD CONSTRAINT "upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "upload_user_sha256_idx" ON "upload" USING btree ("user_id","original_sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_sha256_idx" ON "upload" USING btree ("original_sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_user_id_idx" ON "upload" USING btree ("user_id");
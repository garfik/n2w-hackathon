CREATE TABLE IF NOT EXISTS "avatar" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"source_photo_key" text,
	"body_profile_json" jsonb,
	"height_cm" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "garment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"original_image_key" text NOT NULL,
	"garment_profile_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avatar_id" text NOT NULL,
	"garment_id" text NOT NULL,
	"occasion" text NOT NULL,
	"model_version" text DEFAULT 'gemini-mvp-v1' NOT NULL,
	"score_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tryon_result" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avatar_photo_key" text NOT NULL,
	"garment_photo_key" text NOT NULL,
	"model_version" text DEFAULT 'gemini-mvp-v1' NOT NULL,
	"result_image_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avatar" ADD CONSTRAINT "avatar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "garment" ADD CONSTRAINT "garment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_analysis" ADD CONSTRAINT "outfit_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_analysis" ADD CONSTRAINT "outfit_analysis_avatar_id_avatar_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_analysis" ADD CONSTRAINT "outfit_analysis_garment_id_garment_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tryon_result" ADD CONSTRAINT "tryon_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outfit_analysis_avatar_garment_occasion_version_idx" ON "outfit_analysis" USING btree ("avatar_id","garment_id","occasion","model_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outfit_analysis_user_id_idx" ON "outfit_analysis" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tryon_result_avatar_garment_version_idx" ON "tryon_result" USING btree ("avatar_photo_key","garment_photo_key","model_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tryon_result_user_id_idx" ON "tryon_result" USING btree ("user_id");
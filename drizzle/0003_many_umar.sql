CREATE TABLE IF NOT EXISTS "avatar_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avatar_id" text NOT NULL,
	"photo_hash" text NOT NULL,
	"model_version" text DEFAULT 'gemini-avatar-v1' NOT NULL,
	"response_json" jsonb NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avatar_id" text NOT NULL,
	"occasion" text NOT NULL,
	"result_image_key" text,
	"score_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_garment" (
	"outfit_id" text NOT NULL,
	"garment_id" text NOT NULL,
	CONSTRAINT "outfit_garment_outfit_id_garment_id_pk" PRIMARY KEY("outfit_id","garment_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avatar_analysis" ADD CONSTRAINT "avatar_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avatar_analysis" ADD CONSTRAINT "avatar_analysis_avatar_id_avatar_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit" ADD CONSTRAINT "outfit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit" ADD CONSTRAINT "outfit_avatar_id_avatar_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_garment" ADD CONSTRAINT "outfit_garment_outfit_id_outfit_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_garment" ADD CONSTRAINT "outfit_garment_garment_id_garment_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "avatar_analysis_photo_hash_model_version_idx" ON "avatar_analysis" USING btree ("photo_hash","model_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avatar_analysis_avatar_id_idx" ON "avatar_analysis" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outfit_garment_outfit_id_idx" ON "outfit_garment" USING btree ("outfit_id");
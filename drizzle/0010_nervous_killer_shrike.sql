CREATE TABLE IF NOT EXISTS "token_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"prompt_type" text,
	"related_id" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"succeeded" boolean DEFAULT true NOT NULL,
	"usage_date" date DEFAULT (now() AT TIME ZONE 'UTC')::date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_usage_usage_date_idx" ON "token_usage" USING btree ("usage_date");
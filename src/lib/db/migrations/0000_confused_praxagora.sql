DO $$ BEGIN
 CREATE TYPE "plan" AS ENUM('FREE', 'PAID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "role" AS ENUM('MEMBER', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_playground_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_playground_users" (
	"id" text PRIMARY KEY NOT NULL,
	"firstName" text,
	"lastName" text,
	"email" text NOT NULL,
	"image" text,
	"verificationType" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedInAt" timestamp,
	"lastSignedOutAt" timestamp,
	"role" role DEFAULT 'MEMBER',
	"plan" plan DEFAULT 'FREE'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_idx" ON "llm_playground_users" ("email");
CREATE TABLE IF NOT EXISTS "llm_playground_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"userId" serial NOT NULL
);

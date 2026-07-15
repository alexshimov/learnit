CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
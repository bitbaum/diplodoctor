CREATE TABLE "health_files" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sealed" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_files" ADD CONSTRAINT "health_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- The deploy applies migrations as the postgres superuser, so a new table would
-- be owned by postgres and unreadable to the app's own role (which is how
-- /api/health once said "db down" with the table present). Hand it over when
-- that role exists; a scratch database without it keeps the creator as owner.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'diplodoctor') THEN
    ALTER TABLE "health_files" OWNER TO "diplodoctor";
  END IF;
END $$;

-- Custom domains and per-domain branding (Business).

CREATE TABLE IF NOT EXISTS "custom_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
  "host" text NOT NULL UNIQUE,
  "verification_token" text NOT NULL,
  "verified_at" timestamp with time zone,
  "brand_name" text,
  "brand_color" text,
  "brand_logo_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "custom_domains_user_id_idx" ON "custom_domains" ("user_id");
CREATE INDEX IF NOT EXISTS "custom_domains_project_id_idx" ON "custom_domains" ("project_id");

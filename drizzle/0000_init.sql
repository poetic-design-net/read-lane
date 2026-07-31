CREATE TYPE "public"."visibility" AS ENUM('public', 'unlisted', 'password');
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');
CREATE TYPE "public"."content_width" AS ENUM('narrow', 'normal', 'wide');
CREATE TYPE "public"."font_style" AS ENUM('sans', 'serif');
CREATE TYPE "public"."document_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."version_source" AS ENUM('web', 'cli', 'api');
CREATE TYPE "public"."member_role" AS ENUM('owner', 'editor', 'viewer');
CREATE TYPE "public"."token_scope" AS ENUM('full', 'project_read', 'project_write', 'project_publish');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text,
  "email_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "magic_link_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "default_visibility" "visibility" DEFAULT 'unlisted' NOT NULL,
  "default_theme" "theme" DEFAULT 'system' NOT NULL,
  "default_content_width" "content_width" DEFAULT 'normal' NOT NULL,
  "default_font_style" "font_style" DEFAULT 'sans' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);

CREATE UNIQUE INDEX "projects_owner_slug_idx" ON "projects" ("owner_id","slug");
CREATE INDEX "projects_public_id_idx" ON "projects" ("public_id");
CREATE INDEX "projects_owner_id_idx" ON "projects" ("owner_id");

CREATE TABLE "project_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" "member_role" DEFAULT 'viewer' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "project_members_unique_idx" ON "project_members" ("project_id","user_id");

CREATE TABLE "cli_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "name" text DEFAULT 'CLI' NOT NULL,
  "device_name" text,
  "operating_system" text,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE cascade,
  "scope" "token_scope" DEFAULT 'full' NOT NULL,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "cli_tokens_user_id_idx" ON "cli_tokens" ("user_id");
CREATE INDEX "cli_tokens_token_hash_idx" ON "cli_tokens" ("token_hash");

CREATE TABLE "cli_device_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_code_hash" text NOT NULL UNIQUE,
  "user_code" text NOT NULL UNIQUE,
  "device_name" text,
  "operating_system" text,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "approved_at" timestamp with time zone,
  "issued_token_plain" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "cli_device_codes_user_code_idx" ON "cli_device_codes" ("user_code");

CREATE TABLE "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "slug" text,
  "management_token_hash" text NOT NULL,
  "title" text DEFAULT 'Untitled' NOT NULL,
  "description" text,
  "markdown_content" text NOT NULL,
  "content_checksum" text DEFAULT '' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "visibility" "visibility" DEFAULT 'unlisted' NOT NULL,
  "status" "document_status" DEFAULT 'published' NOT NULL,
  "password_hash" text,
  "theme" "theme" DEFAULT 'system' NOT NULL,
  "content_width" "content_width" DEFAULT 'normal' NOT NULL,
  "font_style" "font_style" DEFAULT 'sans' NOT NULL,
  "show_table_of_contents" boolean DEFAULT false NOT NULL,
  "show_code_line_numbers" boolean DEFAULT false NOT NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE set null,
  "source_path" text,
  "source_filename" text,
  "source_checksum" text,
  "last_cli_sync_at" timestamp with time zone,
  "last_source" "version_source" DEFAULT 'web' NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "published_at" timestamp with time zone
);

CREATE INDEX "documents_public_id_idx" ON "documents" ("public_id");
CREATE INDEX "documents_project_id_idx" ON "documents" ("project_id");
CREATE INDEX "documents_status_idx" ON "documents" ("status");
CREATE INDEX "documents_deleted_at_idx" ON "documents" ("deleted_at");
CREATE INDEX "documents_created_by_idx" ON "documents" ("created_by");

CREATE TABLE "document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "markdown_content" text NOT NULL,
  "content_checksum" text NOT NULL,
  "title" text,
  "source" "version_source" DEFAULT 'web' NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "device_name" text,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "document_versions_doc_version_idx" ON "document_versions" ("document_id","version");
CREATE INDEX "document_versions_document_id_idx" ON "document_versions" ("document_id");

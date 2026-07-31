-- Backend v2: files, audit, jobs, billing fields, free selection
-- Safe to re-run partially; uses IF NOT EXISTS where possible.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" "plan" DEFAULT 'free' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_public_id_idx" ON "users" ("public_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_unique" ON "users" ("stripe_customer_id");

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billing_interval" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone;

ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "payload_hash" text;
ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "error_message" text;

DO $$ BEGIN
  CREATE TYPE "public"."file_upload_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'failed', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."file_scan_status" AS ENUM('pending', 'clean', 'rejected', 'not_required');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."processing_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'canceled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "document_id" uuid REFERENCES "documents"("id") ON DELETE set null,
  "storage_provider" text DEFAULT 'local' NOT NULL,
  "storage_key" text NOT NULL,
  "original_filename" text NOT NULL,
  "safe_filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_extension" text,
  "file_size" integer DEFAULT 0 NOT NULL,
  "checksum" text,
  "upload_status" "file_upload_status" DEFAULT 'pending' NOT NULL,
  "scan_status" "file_scan_status" DEFAULT 'not_required' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "files_owner_id_idx" ON "files" ("owner_id");
CREATE INDEX IF NOT EXISTS "files_document_id_idx" ON "files" ("document_id");
CREATE INDEX IF NOT EXISTS "files_storage_key_idx" ON "files" ("storage_key");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE set null,
  "document_id" uuid REFERENCES "documents"("id") ON DELETE set null,
  "actor_type" text DEFAULT 'user' NOT NULL,
  "actor_id" text,
  "action" text NOT NULL,
  "metadata" text,
  "ip_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");

CREATE TABLE IF NOT EXISTS "processing_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "document_id" uuid REFERENCES "documents"("id") ON DELETE cascade,
  "file_id" uuid REFERENCES "files"("id") ON DELETE cascade,
  "status" "processing_job_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "payload" text,
  "error_message" text,
  "locked_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "processing_jobs_status_idx" ON "processing_jobs" ("status");
CREATE INDEX IF NOT EXISTS "processing_jobs_document_id_idx" ON "processing_jobs" ("document_id");

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "document_access_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE cascade,
  "session_token_hash" text NOT NULL UNIQUE,
  "ip_hash" text,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "doc_access_sessions_document_id_idx" ON "document_access_sessions" ("document_id");

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "key_hash" text NOT NULL,
  "operation" text NOT NULL,
  "response_json" text,
  "status_code" integer,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_user_key_op_idx" ON "idempotency_keys" ("user_id","key_hash","operation");

CREATE TABLE IF NOT EXISTS "free_document_selections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "document_public_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

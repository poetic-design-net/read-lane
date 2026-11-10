-- Client e-mail addresses per project; the MCP publish tool hands them back
-- so the agent can draft the update mail.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "recipients" text[] DEFAULT '{}'::text[] NOT NULL;

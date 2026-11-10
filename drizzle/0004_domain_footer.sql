-- Website link and contact line for branded share pages.

ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "brand_website_url" text;
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "brand_contact" text;

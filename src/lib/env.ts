/**
 * Central environment validation.
 * Secrets never appear in NEXT_PUBLIC_* — client only gets public config.
 */

import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  STORAGE_PROVIDER: z
    .enum(["local", "vercel-blob", "s3"])
    .default("local")
    .optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  STORAGE_LOCAL_PATH: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_YEARLY_PRICE_ID: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  CLI_DEVICE_CODE_SECRET: z.string().optional(),
  FILE_SIGNING_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  INTERNAL_WORKER_SECRET: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Validate and return server env.
 * In production, fails hard on missing DATABASE_URL and weak SESSION_SECRET.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production") {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required in production");
    }
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      throw new Error(
        "SESSION_SECRET (≥32 chars) is required in production"
      );
    }
  }

  cached = env;
  return env;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
        process.env.STRIPE_PRO_YEARLY_PRICE_ID)
  );
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazy DB client. Throws a clear error if DATABASE_URL is missing.
 * Uses Neon HTTP driver — works on Vercel serverless and locally.
 */
export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string."
    );
  }

  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export type Database = ReturnType<typeof getDb>;
export { schema };

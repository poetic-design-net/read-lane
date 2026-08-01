/**
 * Apply the SQL files in drizzle/ against DATABASE_URL, in filename order.
 *
 * The migrations here are hand-written and idempotent (IF NOT EXISTS), so this
 * re-runs safely. It exists because a migration file that is written but never
 * applied looks exactly like a working deploy until a page hits the table.
 *
 *   node --env-file=.env.local scripts/apply-sql.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

/**
 * Split on semicolons, but not inside a `$$ … $$` block — the DO blocks in
 * 0001 would otherwise be cut in half.
 */
function splitStatements(source) {
  const statements = [];
  let current = "";
  let inDollar = false;

  for (const line of source.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    const markers = line.split("$$").length - 1;
    if (markers % 2 === 1) inDollar = !inDollar;
    current += line + "\n";
    if (!inDollar && line.trimEnd().endsWith(";")) {
      const statement = current.trim().replace(/;$/, "").trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }
  const rest = current.trim().replace(/;$/, "").trim();
  if (rest) statements.push(rest);
  return statements;
}

const sql = neon(url);
const dir = join(process.cwd(), "drizzle");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const statements = splitStatements(readFileSync(join(dir, file), "utf8"));

  let skipped = 0;
  for (const statement of statements) {
    try {
      await sql.query(statement);
    } catch (e) {
      // 42710 duplicate_object, 42P07 duplicate_table — the object this
      // statement creates is already there. Every other error is real.
      if (e?.code === "42710" || e?.code === "42P07") {
        skipped += 1;
        continue;
      }
      console.error(`✗ ${file}: ${e.message}`);
      process.exit(1);
    }
  }
  console.log(
    `✓ ${file} (${statements.length} statements${skipped ? `, ${skipped} bereits vorhanden` : ""})`
  );
}

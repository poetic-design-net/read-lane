/**
 * Storage abstraction for original binary files (PDF, images, DOCX).
 * Default: local filesystem under .data/storage (dev).
 * Swap for Vercel Blob / S3 / R2 via STORAGE_DRIVER env later.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export interface StoredObject {
  key: string;
  size: number;
  mimeType: string;
}

const root =
  process.env.STORAGE_LOCAL_PATH ||
  path.join(process.cwd(), ".data", "storage");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function putObject(
  data: Buffer,
  opts: { mimeType: string; extension?: string; prefix?: string }
): Promise<StoredObject> {
  const id = randomBytes(16).toString("hex");
  const ext = opts.extension ? `.${opts.extension.replace(/^\./, "")}` : "";
  const prefix = (opts.prefix ?? "files").replace(/[^a-z0-9/_-]/gi, "");
  const key = `${prefix}/${id}${ext}`;
  const full = path.join(root, key);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, data);
  return { key, size: data.length, mimeType: opts.mimeType };
}

export async function getObject(
  key: string
): Promise<{ data: Buffer; mimeType?: string } | null> {
  const full = path.join(root, key);
  try {
    const data = await fs.readFile(full);
    return { data };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const full = path.join(root, key);
  try {
    await fs.unlink(full);
  } catch {
    // ignore
  }
}

/** Dev helper: serve path for authenticated routes only */
export function localPathForKey(key: string): string {
  return path.join(root, key);
}

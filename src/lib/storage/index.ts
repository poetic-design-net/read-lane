/**
 * Storage abstraction (backend.md §15).
 * Providers: local (dev), vercel-blob (prod), s3-compatible later.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHmac } from "crypto";
import { isBlobConfigured } from "@/lib/env";

export interface UploadIntent {
  uploadId: string;
  key: string;
  uploadUrl: string | null;
  method: "PUT" | "POST";
  headers?: Record<string, string>;
  expiresAt: Date;
}

export interface StoredFile {
  key: string;
  size: number;
  mimeType: string;
  checksum?: string;
}

export interface StorageProvider {
  createUploadUrl(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
  }): Promise<UploadIntent>;
  putObject(
    data: Buffer,
    opts: { mimeType: string; extension?: string; prefix?: string; key?: string }
  ): Promise<StoredFile>;
  confirmUpload(input: {
    key: string;
    expectedSize?: number;
  }): Promise<StoredFile>;
  getSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  getObject(key: string): Promise<{ data: Buffer; mimeType?: string } | null>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean>;
}

/* ─── Local filesystem (dev) ───────────────────────────────────────────── */

const localRoot =
  process.env.STORAGE_LOCAL_PATH ||
  path.join(process.cwd(), ".data", "storage");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function signingSecret(): string {
  return (
    process.env.FILE_SIGNING_SECRET ||
    process.env.SESSION_SECRET ||
    "dev-file-signing-secret"
  );
}

class LocalStorageProvider implements StorageProvider {
  async createUploadUrl(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
  }): Promise<UploadIntent> {
    const uploadId = randomBytes(16).toString("hex");
    // Client uploads via our API proxy in local mode
    return {
      uploadId,
      key: input.key,
      uploadUrl: null,
      method: "PUT",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async putObject(
    data: Buffer,
    opts: { mimeType: string; extension?: string; prefix?: string; key?: string }
  ): Promise<StoredFile> {
    const id = randomBytes(16).toString("hex");
    const ext = opts.extension ? `.${opts.extension.replace(/^\./, "")}` : "";
    const prefix = (opts.prefix ?? "files").replace(/[^a-z0-9/_-]/gi, "");
    const key = opts.key ?? `${prefix}/${id}${ext}`;
    const full = path.join(localRoot, key);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, data);
    return { key, size: data.length, mimeType: opts.mimeType };
  }

  async confirmUpload(input: {
    key: string;
    expectedSize?: number;
  }): Promise<StoredFile> {
    const full = path.join(localRoot, input.key);
    const stat = await fs.stat(full);
    if (input.expectedSize != null && stat.size !== input.expectedSize) {
      throw new Error("Uploaded size mismatch");
    }
    return { key: input.key, size: stat.size, mimeType: "application/octet-stream" };
  }

  async getSignedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createHmac("sha256", signingSecret())
      .update(`${key}:${exp}`)
      .digest("hex");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${base}/api/v1/files/signed?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
  }

  async getObject(
    key: string
  ): Promise<{ data: Buffer; mimeType?: string } | null> {
    const full = path.join(localRoot, key);
    try {
      const data = await fs.readFile(full);
      return { data };
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const full = path.join(localRoot, key);
    try {
      await fs.unlink(full);
    } catch {
      // ignore
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const full = path.join(localRoot, key);
    try {
      await fs.access(full);
      return true;
    } catch {
      return false;
    }
  }
}

/* ─── Vercel Blob ──────────────────────────────────────────────────────── */

class VercelBlobStorageProvider implements StorageProvider {
  async createUploadUrl(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
  }): Promise<UploadIntent> {
    // Prefer server-side put; client direct upload can be added later
    const uploadId = randomBytes(16).toString("hex");
    return {
      uploadId,
      key: input.key,
      uploadUrl: null,
      method: "PUT",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async putObject(
    data: Buffer,
    opts: { mimeType: string; extension?: string; prefix?: string; key?: string }
  ): Promise<StoredFile> {
    const { put } = await import("@vercel/blob");
    const id = randomBytes(16).toString("hex");
    const ext = opts.extension ? `.${opts.extension.replace(/^\./, "")}` : "";
    const prefix = (opts.prefix ?? "files").replace(/[^a-z0-9/_-]/gi, "");
    const key = opts.key ?? `${prefix}/${id}${ext}`;
    const blob = await put(key, data, {
      access: "public", // Vercel Blob private requires enterprise; use signed proxy for public docs
      contentType: opts.mimeType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      key: blob.pathname || key,
      size: data.length,
      mimeType: opts.mimeType,
    };
  }

  async confirmUpload(input: {
    key: string;
    expectedSize?: number;
  }): Promise<StoredFile> {
    const exists = await this.fileExists(input.key);
    if (!exists) throw new Error("Upload not found");
    return {
      key: input.key,
      size: input.expectedSize ?? 0,
      mimeType: "application/octet-stream",
    };
  }

  async getSignedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    // Proxy through our API for access control
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createHmac("sha256", signingSecret())
      .update(`${key}:${exp}`)
      .digest("hex");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${base}/api/v1/files/signed?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
  }

  async getObject(
    key: string
  ): Promise<{ data: Buffer; mimeType?: string } | null> {
    try {
      const { head, get } = await import("@vercel/blob");
      await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
      const result = await get(key, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (!result || !("stream" in result) || !result.stream) return null;
      const chunks: Buffer[] = [];
      const reader = result.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
      return { data: Buffer.concat(chunks) };
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const { del } = await import("@vercel/blob");
      await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // ignore
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const { head } = await import("@vercel/blob");
      await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return true;
    } catch {
      return false;
    }
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  const driver =
    process.env.STORAGE_PROVIDER ||
    (isBlobConfigured() ? "vercel-blob" : "local");
  provider =
    driver === "vercel-blob" && isBlobConfigured()
      ? new VercelBlobStorageProvider()
      : new LocalStorageProvider();
  return provider;
}

/** Build storage key path — never include emails */
export function buildStorageKey(parts: {
  userPublicId: string;
  documentPublicId?: string;
  filePublicId: string;
  extension?: string;
}): string {
  const ext = parts.extension
    ? `.${parts.extension.replace(/^\./, "")}`
    : "";
  const doc = parts.documentPublicId ?? "inbox";
  return `users/${parts.userPublicId}/documents/${doc}/${parts.filePublicId}${ext}`;
}

export function verifySignedFileParams(
  key: string,
  exp: number,
  sig: string
): boolean {
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", signingSecret())
    .update(`${key}:${exp}`)
    .digest("hex");
  return expected === sig;
}

// Back-compat exports
export async function putObject(
  data: Buffer,
  opts: { mimeType: string; extension?: string; prefix?: string }
) {
  return getStorage().putObject(data, opts);
}

export async function getObject(key: string) {
  return getStorage().getObject(key);
}

export async function deleteObject(key: string) {
  return getStorage().deleteFile(key);
}

export function localPathForKey(key: string): string {
  return path.join(localRoot, key);
}

export type { StoredFile as StoredObject };

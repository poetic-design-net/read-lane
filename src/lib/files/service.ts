/**
 * File upload validation & processing pipeline (backend.md §13–§16).
 */

import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { files, users } from "@/lib/db/schema";
import {
  detectRenderer,
  extensionOf,
  type RendererType,
} from "@/lib/documents/formats";
import {
  assertCanUseRenderer,
  assertWithinFileSize,
  assertWithinStorageLimit,
} from "@/lib/plans/service";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { createSharePublicId } from "@/lib/security/tokens";
import { writeAuditLog } from "@/lib/audit/service";

export class FileError extends Error {
  constructor(
    message: string,
    public code:
      | "UNSUPPORTED_FILE_TYPE"
      | "FILE_TOO_LARGE"
      | "INVALID_FILE_CONTENT"
      | "UPLOAD_FAILED"
      | "BLOCKED_SECRET"
  ) {
    super(message);
    this.name = "FileError";
  }
}

const BLOCKED_NAMES = [
  /^\.env(\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
];

const MAGIC: Array<{ renderer: RendererType; bytes: number[]; offset?: number }> = [
  { renderer: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { renderer: "image", bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { renderer: "image", bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG
  { renderer: "image", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF
  { renderer: "image", bytes: [0x52, 0x49, 0x46, 0x46] }, // WEBP (RIFF…)
];

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180) || "file";
}

export function assertNotBlockedSecret(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  for (const re of BLOCKED_NAMES) {
    if (re.test(base)) {
      throw new FileError(
        "Secret- oder Credential-Dateien sind nicht erlaubt.",
        "BLOCKED_SECRET"
      );
    }
  }
}

export function detectMagicBytes(buf: Buffer): RendererType | null {
  for (const m of MAGIC) {
    const offset = m.offset ?? 0;
    if (buf.length < offset + m.bytes.length) continue;
    let ok = true;
    for (let i = 0; i < m.bytes.length; i++) {
      if (buf[offset + i] !== m.bytes[i]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      if (m.renderer === "image" && m.bytes[0] === 0x52) {
        // RIFF….WEBP
        if (buf.length >= 12 && buf.toString("ascii", 8, 12) === "WEBP") {
          return "image";
        }
        continue;
      }
      return m.renderer;
    }
  }
  return null;
}

export function isLikelyText(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  let suspicious = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 7 || (b > 14 && b < 32 && b !== 9 && b !== 10 && b !== 13)) {
      suspicious++;
    }
  }
  return suspicious / sample.length < 0.05;
}

export async function processUpload(input: {
  userId: string;
  filename: string;
  mimeType?: string | null;
  data: Buffer;
  documentPublicId?: string | null;
}) {
  assertNotBlockedSecret(input.filename);
  const safeFilename = sanitizeFilename(input.filename);
  const ext = extensionOf(safeFilename);
  const byName = detectRenderer(safeFilename, input.mimeType);
  const byMagic = detectMagicBytes(input.data);

  // Binary formats must match magic when present
  if (byName === "pdf" && byMagic !== "pdf") {
    throw new FileError("Datei ist kein gültiges PDF.", "INVALID_FILE_CONTENT");
  }
  if (byName === "image" && byMagic !== "image") {
    throw new FileError("Datei ist kein gültiges Bild.", "INVALID_FILE_CONTENT");
  }

  const rendererType: RendererType = byMagic ?? byName;

  if (["markdown", "text", "code", "csv", "html"].includes(rendererType)) {
    if (!isLikelyText(input.data)) {
      throw new FileError(
        "Binärdatei kann nicht als Text verarbeitet werden.",
        "INVALID_FILE_CONTENT"
      );
    }
  }

  if (rendererType === "docx") {
    // Phase 2: store + job only
  }

  await assertCanUseRenderer(input.userId, rendererType);
  await assertWithinFileSize(input.userId, input.data.length);
  await assertWithinStorageLimit(input.userId, input.data.length);

  const db = getDb();
  const [user] = await db
    .select({ publicId: users.publicId, id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  let userPublicId = user?.publicId;
  if (!userPublicId) {
    userPublicId = `usr_${createSharePublicId()}`;
    await db
      .update(users)
      .set({ publicId: userPublicId, updatedAt: new Date() })
      .where(eq(users.id, input.userId));
  }

  const filePublicId = createSharePublicId();
  const checksum = createHash("sha256").update(input.data).digest("hex");
  const key = buildStorageKey({
    userPublicId,
    documentPublicId: input.documentPublicId ?? undefined,
    filePublicId,
    extension: ext || undefined,
  });

  const storage = getStorage();
  let stored;
  try {
    stored = await storage.putObject(input.data, {
      mimeType: input.mimeType || "application/octet-stream",
      extension: ext || undefined,
      key,
    });
  } catch {
    throw new FileError("Upload fehlgeschlagen", "UPLOAD_FAILED");
  }

  const [file] = await db
    .insert(files)
    .values({
      publicId: filePublicId,
      ownerId: input.userId,
      storageProvider: process.env.STORAGE_PROVIDER || "local",
      storageKey: stored.key,
      originalFilename: input.filename,
      safeFilename,
      mimeType: input.mimeType || "application/octet-stream",
      fileExtension: ext || null,
      fileSize: input.data.length,
      checksum,
      uploadStatus: "ready",
      scanStatus: "not_required",
    })
    .returning();

  await writeAuditLog({
    action: "file.uploaded",
    actorType: "user",
    userId: input.userId,
    actorId: input.userId,
    metadata: {
      filePublicId,
      rendererType,
      size: input.data.length,
    },
  });

  // Extract text content for text-like formats
  let content: string | null = null;
  if (["markdown", "text", "code", "csv", "html"].includes(rendererType)) {
    content = input.data.toString("utf8");
    // Strip MDX executable syntax lightly
    if (ext === "mdx") {
      content = content
        .replace(/^import\s.+$/gm, "")
        .replace(/^export\s.+$/gm, "");
    }
  }

  return {
    file: file!,
    rendererType,
    content,
    storageKey: stored.key,
    checksum,
  };
}

export function createUploadIntentId(): string {
  return `upl_${randomBytes(12).toString("hex")}`;
}

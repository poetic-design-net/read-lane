/**
 * File upload validation & processing pipeline (backend.md §13–§16).
 */

import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, files, users } from "@/lib/db/schema";
import {
  detectRenderer,
  extensionOf,
  isBlockedFilename,
  sanitizeFilename,
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

const MAGIC: Array<{ renderer: RendererType; bytes: number[]; offset?: number }> = [
  { renderer: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { renderer: "image", bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { renderer: "image", bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG
  { renderer: "image", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF
  { renderer: "image", bytes: [0x52, 0x49, 0x46, 0x46] }, // WEBP (RIFF…)
];

export { sanitizeFilename };

export function assertNotBlockedSecret(filename: string) {
  if (isBlockedFilename(filename)) {
    throw new FileError(
      "Secret- oder Credential-Dateien sind nicht erlaubt.",
      "BLOCKED_SECRET"
    );
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

/**
 * Resolve an uploaded file the caller owns.
 * The storage key is never accepted from a request — it is looked up here.
 */
export async function getOwnedFileByPublicId(
  publicId: string,
  userId: string
) {
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.publicId, publicId),
        eq(files.ownerId, userId),
        isNull(files.deletedAt)
      )
    )
    .limit(1);
  return file ?? null;
}

/** Link an uploaded file to the document it was published as. */
export async function attachFileToDocument(
  filePublicId: string,
  documentPublicId: string
) {
  const db = getDb();
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.publicId, documentPublicId))
    .limit(1);
  if (!doc) return;
  await db
    .update(files)
    .set({ documentId: doc.id })
    .where(eq(files.publicId, filePublicId));
}

/**
 * Only these types may render inline. Everything else is forced to download,
 * so uploaded HTML/SVG can never execute on our own origin.
 */
const INLINE_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Decide how a stored object is served.
 * `forceDownload` covers the explicit download button; everything not on the
 * inline allowlist is served as an attachment regardless.
 */
export function resolveDelivery(input: {
  mimeType?: string | null;
  extension?: string | null;
  forceDownload?: boolean;
}): { contentType: string; disposition: "inline" | "attachment" } {
  const byExtension = input.extension
    ? EXTENSION_CONTENT_TYPES[input.extension.replace(/^\./, "").toLowerCase()]
    : undefined;
  const declared = input.mimeType?.split(";")[0]?.trim().toLowerCase();
  const contentType =
    (declared && declared !== "application/octet-stream" ? declared : null) ??
    byExtension ??
    "application/octet-stream";

  const inline = !input.forceDownload && INLINE_CONTENT_TYPES.has(contentType);
  return {
    contentType,
    disposition: inline ? "inline" : "attachment",
  };
}

/** Content type for a stored object, used by the signed file proxy. */
export async function getFileByStorageKey(storageKey: string) {
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.storageKey, storageKey), isNull(files.deletedAt)))
    .limit(1);
  return file ?? null;
}

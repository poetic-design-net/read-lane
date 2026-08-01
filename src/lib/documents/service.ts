import { and, desc, eq, isNull, or, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  documentVersions,
  documents,
  type Document,
} from "@/lib/db/schema";
import { appConfig } from "@/lib/config";
import {
  createManagementToken,
  createSharePublicId,
  sha256,
  verifySecret,
} from "@/lib/security/tokens";
import { hashPassword } from "@/lib/security/passwords";
import { contentChecksum } from "@/lib/utils/checksum";
import { resolveExpiresAt, isExpired } from "@/lib/utils/expiry";
import { manageUrl, shareUrl } from "@/lib/utils/urls";
import type {
  PublishDocumentInput,
  UpdateDocumentInput,
} from "@/lib/validation/document";
import type { VersionSource } from "@/types/document";
import { toListItem, toManageableDocument, toPublicDocument } from "./mappers";
import {
  detectRenderer,
  extensionOf,
  type RendererType,
} from "./formats";
import {
  assertCanCreateActiveDocument,
  assertCanUsePassword,
  PlanError,
} from "@/lib/plans/service";

export class DocumentError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "EXPIRED"
      | "ARCHIVED"
      | "UNAUTHORIZED"
      | "CONFLICT"
      | "VALIDATION"
      | "FORBIDDEN"
      | "PLAN_LIMIT"
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

async function saveVersion(
  documentId: string,
  version: number,
  markdownContent: string,
  checksum: string,
  title: string,
  source: VersionSource,
  createdBy?: string | null,
  deviceName?: string | null,
  note?: string | null
) {
  const db = getDb();
  await db.insert(documentVersions).values({
    documentId,
    version,
    markdownContent,
    contentChecksum: checksum,
    title,
    source,
    createdBy: createdBy ?? null,
    deviceName: deviceName ?? null,
    note: note ?? null,
  });

  // Prune old versions
  const max = appConfig.maxVersionsPerDocument;
  const old = await db
    .select({ id: documentVersions.id, version: documentVersions.version })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version));

  if (old.length > max) {
    const toDelete = old.slice(max).map((v) => v.id);
    for (const id of toDelete) {
      await db.delete(documentVersions).where(eq(documentVersions.id, id));
    }
  }
}

export async function createDocument(
  input: PublishDocumentInput,
  options: {
    userId?: string | null;
    source?: VersionSource;
    deviceName?: string | null;
    /** When true and free slot full: replace the active free document in place */
    replaceActive?: boolean;
    mimeType?: string | null;
    fileSize?: number | null;
    originalFileKey?: string | null;
  } = {}
) {
  const status = input.status ?? "published";
  const source = options.source ?? "web";
  const filename =
    input.sourceFilename ||
    (input.title ? `${input.title}.md` : "document.md");
  const rendererType: RendererType =
    (input as { rendererType?: RendererType }).rendererType ??
    detectRenderer(filename, options.mimeType);
  const fileExtension = extensionOf(filename) || "md";

  // Account + plan enforcement
  if (options.userId && status === "published") {
    try {
      if (options.replaceActive) {
        await assertCanCreateActiveDocument(options.userId, {
          replaceExisting: true,
        });
      } else {
        await assertCanCreateActiveDocument(options.userId);
      }
      if (input.visibility === "password") {
        await assertCanUsePassword(options.userId);
      }
    } catch (e) {
      if (e instanceof PlanError) {
        throw new DocumentError(e.message, "PLAN_LIMIT");
      }
      throw e;
    }
  }

  // Free replace path: update existing active document, keep publicId
  if (options.userId && options.replaceActive && status === "published") {
    const existing = await findActivePublishedByUser(options.userId);
    if (existing) {
      return replaceDocumentContent(existing, input, {
        userId: options.userId,
        source,
        deviceName: options.deviceName,
        mimeType: options.mimeType,
        fileSize: options.fileSize,
        originalFileKey: options.originalFileKey,
        rendererType,
        fileExtension,
        filename,
      });
    }
  }

  const db = getDb();
  const managementToken = createManagementToken();
  const managementTokenHash = sha256(managementToken);
  const publicId = createSharePublicId();
  const checksum = contentChecksum(input.markdownContent);
  const passwordHash =
    input.visibility === "password" && input.password
      ? await hashPassword(input.password)
      : null;

  const expiresAt = resolveExpiresAt(
    input.expiryPreset,
    input.customExpiryDate
  );

  const [doc] = await db
    .insert(documents)
    .values({
      publicId,
      managementTokenHash,
      title: input.title,
      description: input.description ?? null,
      markdownContent: input.markdownContent,
      contentChecksum: checksum,
      version: 1,
      visibility: input.visibility,
      status,
      passwordHash,
      theme: input.theme,
      contentWidth: input.contentWidth,
      fontStyle: input.fontStyle,
      showTableOfContents: input.showTableOfContents,
      showCodeLineNumbers: input.showCodeLineNumbers,
      allowDownload: input.allowDownload ?? true,
      projectId: input.projectId ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceFilename: input.sourceFilename ?? filename,
      sourceChecksum: checksum,
      lastCliSyncAt: source === "cli" ? new Date() : null,
      lastSource: source,
      createdBy: options.userId ?? null,
      updatedBy: options.userId ?? null,
      expiresAt,
      publishedAt: status === "published" ? new Date() : null,
      slug: input.slug ?? null,
      rendererType,
      mimeType: options.mimeType ?? null,
      fileExtension,
      fileSize: options.fileSize ?? Buffer.byteLength(input.markdownContent),
      originalFileKey: options.originalFileKey ?? null,
    })
    .returning();

  if (!doc) throw new DocumentError("Create failed", "VALIDATION");

  // Version history only for plans that allow it (still store v1 for pro+)
  const { getUserPlan } = await import("@/lib/plans/service");
  const plan = options.userId ? await getUserPlan(options.userId) : "free";
  if (plan !== "free") {
    await saveVersion(
      doc.id,
      1,
      doc.markdownContent,
      checksum,
      doc.title,
      source,
      options.userId,
      options.deviceName,
      "Initial version"
    );
  }

  return {
    document: toManageableDocument(doc),
    managementToken,
    shareUrl: shareUrl(publicId),
    manageUrl: manageUrl(managementToken),
    replaced: false as const,
  };
}

async function findActivePublishedByUser(userId: string) {
  const db = getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.createdBy, userId),
        eq(documents.status, "published"),
        isNull(documents.deletedAt),
        isNull(documents.archivedAt)
      )
    )
    .limit(1);
  return doc ?? null;
}

/**
 * Free-tier replace: same publicId / share link, new content.
 * No version history retained on free.
 */
export async function replaceDocumentContent(
  doc: Document,
  input: PublishDocumentInput,
  options: {
    userId?: string | null;
    source?: VersionSource;
    deviceName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    originalFileKey?: string | null;
    rendererType: RendererType;
    fileExtension: string;
    filename: string;
  }
) {
  const db = getDb();
  const checksum = contentChecksum(input.markdownContent);
  const source = options.source ?? "web";

  // Free: no password
  let passwordHash = doc.passwordHash;
  let visibility = input.visibility;
  if (options.userId) {
    try {
      if (visibility === "password") {
        await assertCanUsePassword(options.userId);
      }
    } catch (e) {
      if (e instanceof PlanError) {
        visibility = visibility === "password" ? "unlisted" : visibility;
        passwordHash = null;
      } else throw e;
    }
  }
  if (visibility !== "password") passwordHash = null;
  else if (input.password) {
    passwordHash = await hashPassword(input.password);
  }

  const [updated] = await db
    .update(documents)
    .set({
      title: input.title,
      description: input.description ?? null,
      markdownContent: input.markdownContent,
      contentChecksum: checksum,
      version: doc.version + 1,
      visibility,
      status: "published",
      passwordHash,
      theme: input.theme,
      contentWidth: input.contentWidth,
      fontStyle: input.fontStyle,
      showTableOfContents: input.showTableOfContents,
      showCodeLineNumbers: input.showCodeLineNumbers,
      allowDownload: input.allowDownload ?? true,
      sourceFilename: input.sourceFilename ?? options.filename,
      sourcePath: input.sourcePath ?? doc.sourcePath,
      sourceChecksum: checksum,
      lastSource: source,
      lastCliSyncAt: source === "cli" ? new Date() : doc.lastCliSyncAt,
      updatedBy: options.userId ?? null,
      updatedAt: new Date(),
      publishedAt: doc.publishedAt ?? new Date(),
      rendererType: options.rendererType,
      // Replace swaps the whole source, so file metadata is overwritten rather
      // than merged — otherwise a markdown replacement keeps pointing at the
      // PDF it replaced.
      mimeType: options.mimeType ?? null,
      fileExtension: options.fileExtension,
      fileSize:
        options.fileSize ?? Buffer.byteLength(input.markdownContent),
      originalFileKey: options.originalFileKey ?? null,
      archivedAt: null,
    })
    .where(eq(documents.id, doc.id))
    .returning();

  if (!updated) throw new DocumentError("Replace failed", "VALIDATION");

  return {
    document: toManageableDocument(updated),
    managementToken: "", // not re-issued on replace
    shareUrl: shareUrl(updated.publicId),
    manageUrl: "",
    replaced: true as const,
  };
}

export async function getDocumentByPublicId(
  publicId: string,
  options: { includeDeleted?: boolean } = {}
): Promise<Document | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.publicId, publicId),
        options.includeDeleted ? undefined : isNull(documents.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export function assertDocumentAccessible(doc: Document): void {
  if (doc.deletedAt) {
    throw new DocumentError("Dokument nicht gefunden", "NOT_FOUND");
  }
  if (doc.status === "archived" || doc.archivedAt) {
    throw new DocumentError("Dokument ist archiviert", "ARCHIVED");
  }
  if (doc.status === "draft") {
    throw new DocumentError("Dokument nicht gefunden", "NOT_FOUND");
  }
  if (isExpired(doc.expiresAt)) {
    throw new DocumentError("Dokument ist abgelaufen", "EXPIRED");
  }
}

export async function getPublicDocumentView(publicId: string) {
  const doc = await getDocumentByPublicId(publicId);
  if (!doc) {
    throw new DocumentError("Dokument nicht gefunden", "NOT_FOUND");
  }
  assertDocumentAccessible(doc);
  return {
    document: toPublicDocument(doc),
    requiresPassword:
      doc.visibility === "password" || Boolean(doc.passwordHash),
    passwordHash: doc.passwordHash,
    raw: doc,
  };
}

export async function verifyManagementToken(
  publicId: string,
  token: string
): Promise<Document> {
  // Token-only manage URLs: look up by trying candidates is expensive.
  // We store only hash — need to find by scanning... Better approach:
  // management URL contains only the token; we store a lookup hash index.
  // For manage routes that receive the full token, we find documents where hash matches.
  // Since we can't reverse the hash, manage routes should include publicId OR we iterate — bad.
  // Standard pattern: manage URL is /manage/[token] and we store tokenHash unique.
  // Lookup: we need to get all recent docs? No — use a secondary approach:
  // Store sha256 of token as lookup key... We only have bcrypt hash.
  //
  // Solution: change manage flow to accept token and scan is NOT viable.
  // We'll use: management URL format /manage/[publicId]/[token] OR store sha256 alongside.
  //
  // Practical fix: managementTokenHash is bcrypt of token. For lookup we need another field.
  // Add lookup via tokenPrefix? Best: use sha256 for management token lookup (high entropy)
  // and bcrypt is overkill for 32-char nanoid. Spec says "hash" — sha256 is fine for tokens.
  //
  // I'll switch management tokens to sha256 for lookup, passwords stay bcrypt.

  const tokenHash = sha256(token);
  const db = getDb();
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.managementTokenHash, tokenHash),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);

  if (rows[0]) {
    if (publicId && rows[0].publicId !== publicId) {
      throw new DocumentError("Ungültiger Verwaltungslink", "UNAUTHORIZED");
    }
    return rows[0];
  }

  // Fallback: publicId + legacy bcrypt-hashed management token
  if (publicId) {
    const doc = await getDocumentByPublicId(publicId);
    if (doc && (await verifySecret(token, doc.managementTokenHash))) {
      return doc;
    }
  }

  throw new DocumentError("Ungültiger Verwaltungslink", "UNAUTHORIZED");
}

export async function getDocumentByManagementToken(
  token: string
): Promise<Document> {
  return verifyManagementToken("", token);
}

export async function updateDocumentById(
  doc: Document,
  input: UpdateDocumentInput,
  options: {
    userId?: string | null;
    source?: VersionSource;
    deviceName?: string | null;
  } = {}
) {
  if (
    input.baseVersion != null &&
    input.baseVersion !== doc.version &&
    !input.force
  ) {
    throw new DocumentError(
      "Das Dokument wurde seit der letzten Synchronisierung online geändert.",
      "CONFLICT"
    );
  }

  const db = getDb();
  const source = options.source ?? "web";
  let nextVersion = doc.version;
  let checksum = doc.contentChecksum;
  let markdownContent = doc.markdownContent;
  let contentChanged = false;

  if (
    input.markdownContent != null &&
    input.markdownContent !== doc.markdownContent
  ) {
    markdownContent = input.markdownContent;
    checksum = contentChecksum(markdownContent);
    nextVersion = doc.version + 1;
    contentChanged = true;
  }

  let passwordHash = doc.passwordHash;
  if (input.clearPassword) {
    passwordHash = null;
  } else if (input.password) {
    passwordHash = await hashPassword(input.password);
  }

  const visibility = input.visibility ?? doc.visibility;
  if (visibility === "password" && !passwordHash && !input.password) {
    // keep existing or require
    if (!doc.passwordHash) {
      throw new DocumentError(
        "Passwort erforderlich für passwortgeschützte Dokumente",
        "VALIDATION"
      );
    }
  }

  let expiresAt = doc.expiresAt;
  if (input.expiryPreset) {
    expiresAt = resolveExpiresAt(input.expiryPreset, input.customExpiryDate);
  }

  const status = input.status ?? doc.status;

  const [updated] = await db
    .update(documents)
    .set({
      title: input.title ?? doc.title,
      description:
        input.description !== undefined ? input.description : doc.description,
      markdownContent,
      contentChecksum: checksum,
      version: nextVersion,
      visibility,
      status,
      passwordHash: input.clearPassword
        ? null
        : visibility === "password"
          ? passwordHash
          : passwordHash,
      theme: input.theme ?? doc.theme,
      contentWidth: input.contentWidth ?? doc.contentWidth,
      fontStyle: input.fontStyle ?? doc.fontStyle,
      showTableOfContents:
        input.showTableOfContents ?? doc.showTableOfContents,
      showCodeLineNumbers:
        input.showCodeLineNumbers ?? doc.showCodeLineNumbers,
      allowDownload: input.allowDownload ?? doc.allowDownload,
      sourcePath:
        input.sourcePath !== undefined ? input.sourcePath : doc.sourcePath,
      sourceFilename:
        input.sourceFilename !== undefined
          ? input.sourceFilename
          : doc.sourceFilename,
      sourceChecksum:
        input.sourceChecksum !== undefined
          ? input.sourceChecksum
          : contentChanged
            ? checksum
            : doc.sourceChecksum,
      lastCliSyncAt: source === "cli" ? new Date() : doc.lastCliSyncAt,
      lastSource: source,
      updatedBy: options.userId ?? doc.updatedBy,
      updatedAt: new Date(),
      expiresAt,
      publishedAt:
        status === "published" && !doc.publishedAt
          ? new Date()
          : doc.publishedAt,
      slug: input.slug !== undefined ? input.slug : doc.slug,
    })
    .where(eq(documents.id, doc.id))
    .returning();

  if (!updated) throw new DocumentError("Update failed", "NOT_FOUND");

  if (contentChanged) {
    await saveVersion(
      doc.id,
      nextVersion,
      markdownContent,
      checksum,
      updated.title,
      source,
      options.userId,
      options.deviceName,
      "Content update"
    );
  }

  return toManageableDocument(updated);
}

export async function softDeleteDocument(doc: Document) {
  const db = getDb();
  await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(documents.id, doc.id));
}

export async function regeneratePublicId(doc: Document) {
  const db = getDb();
  const publicId = createSharePublicId();
  const [updated] = await db
    .update(documents)
    .set({ publicId, updatedAt: new Date() })
    .where(eq(documents.id, doc.id))
    .returning();
  if (!updated) throw new DocumentError("Not found", "NOT_FOUND");
  return toManageableDocument(updated);
}

export async function listDocumentsForUser(
  userId: string,
  filters: {
    projectId?: string;
    status?: string;
    visibility?: string;
    q?: string;
    limit?: number;
  } = {}
) {
  const db = getDb();
  const conditions = [
    isNull(documents.deletedAt),
    eq(documents.createdBy, userId),
  ];

  if (filters.projectId) {
    conditions.push(eq(documents.projectId, filters.projectId));
  }
  if (filters.status) {
    conditions.push(
      eq(
        documents.status,
        filters.status as "draft" | "published" | "archived"
      )
    );
  }
  if (filters.visibility) {
    conditions.push(
      eq(
        documents.visibility,
        filters.visibility as "public" | "unlisted" | "password"
      )
    );
  }
  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(documents.title, q),
        ilike(documents.description, q),
        ilike(documents.sourceFilename, q),
        ilike(documents.sourcePath, q),
        ilike(documents.slug, q)
      )!
    );
  }

  const rows = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.updatedAt))
    .limit(filters.limit ?? 100);

  return rows.map(toListItem);
}

/** Assign or clear a document's project. Access checks live in the caller. */
export async function moveDocumentToProject(
  documentId: string,
  projectId: string | null
) {
  const db = getDb();
  await db
    .update(documents)
    .set({ projectId, updatedAt: new Date() })
    .where(eq(documents.id, documentId));
}

export async function listVersions(documentId: string) {
  const db = getDb();
  return db
    .select({
      version: documentVersions.version,
      contentChecksum: documentVersions.contentChecksum,
      title: documentVersions.title,
      source: documentVersions.source,
      deviceName: documentVersions.deviceName,
      note: documentVersions.note,
      createdAt: documentVersions.createdAt,
      createdBy: documentVersions.createdBy,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version))
    .limit(appConfig.maxVersionsPerDocument);
}

export async function getVersion(documentId: string, version: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.version, version)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function restoreVersion(
  doc: Document,
  version: number,
  userId?: string
) {
  const v = await getVersion(doc.id, version);
  if (!v) throw new DocumentError("Version nicht gefunden", "NOT_FOUND");
  return updateDocumentById(
    doc,
    {
      markdownContent: v.markdownContent,
      title: v.title ?? undefined,
      force: true,
    },
    { userId, source: "web" }
  );
}

/** Hash management token as sha256 for O(1) lookup. */
export async function hashManagementToken(token: string): Promise<string> {
  const { sha256 } = await import("@/lib/security/tokens");
  return sha256(token);
}

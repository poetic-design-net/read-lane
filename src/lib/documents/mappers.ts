import type { Document } from "@/lib/db/schema";
import type {
  ManageableDocument,
  PublicDocument,
  RendererType,
  SafeDocumentListItem,
} from "@/types/document";

export function toPublicDocument(doc: Document): PublicDocument {
  return {
    publicId: doc.publicId,
    title: doc.title,
    description: doc.description,
    markdownContent: doc.markdownContent,
    visibility: doc.visibility,
    status: doc.status,
    theme: doc.theme,
    contentWidth: doc.contentWidth,
    fontStyle: doc.fontStyle,
    showTableOfContents: doc.showTableOfContents,
    showCodeLineNumbers: doc.showCodeLineNumbers,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    expiresAt: doc.expiresAt,
    isPasswordProtected:
      Boolean(doc.passwordHash) || doc.visibility === "password",
    version: doc.version,
    rendererType: (doc.rendererType as RendererType) ?? "markdown",
    sourceFilename: doc.sourceFilename,
    fileExtension: doc.fileExtension,
    allowDownload: doc.allowDownload ?? true,
  };
}

export function toManageableDocument(doc: Document): ManageableDocument {
  return {
    ...toPublicDocument(doc),
    hasPassword: Boolean(doc.passwordHash),
    projectId: doc.projectId,
    sourcePath: doc.sourcePath,
    sourceFilename: doc.sourceFilename,
    slug: doc.slug,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
  };
}

export function toListItem(doc: Document): SafeDocumentListItem {
  return {
    publicId: doc.publicId,
    title: doc.title,
    description: doc.description,
    visibility: doc.visibility,
    status: doc.status,
    sourceFilename: doc.sourceFilename,
    sourcePath: doc.sourcePath,
    lastSource: doc.lastSource,
    updatedAt: doc.updatedAt,
    lastCliSyncAt: doc.lastCliSyncAt,
    isPasswordProtected:
      Boolean(doc.passwordHash) || doc.visibility === "password",
    version: doc.version,
    slug: doc.slug,
    rendererType: (doc.rendererType as RendererType) ?? "markdown",
    fileExtension: doc.fileExtension,
  };
}

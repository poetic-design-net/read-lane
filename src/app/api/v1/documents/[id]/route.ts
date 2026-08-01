import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
  CliAuthError,
} from "@/lib/cli/tokens";
import { canAccessDocument, type MemberRole } from "@/lib/projects/members";
import {
  DocumentError,
  getDocumentByPublicId,
  updateDocumentById,
  softDeleteDocument,
} from "@/lib/documents/service";
import { updateDocumentSchema } from "@/lib/validation/document";
import { shareUrl } from "@/lib/utils/urls";
import { contentChecksum } from "@/lib/utils/checksum";

async function assertDocAccess(
  publicId: string,
  auth: { userId: string; scope: string; projectId: string | null },
  minRole: MemberRole = "editor"
) {
  const doc = await getDocumentByPublicId(publicId);
  if (!doc) throw new DocumentError("Not found", "NOT_FOUND");
  if (!(await canAccessDocument(doc, auth.userId, minRole))) {
    throw new DocumentError("Forbidden", "FORBIDDEN");
  }
  assertScopeAllowsProject(auth.scope, auth.projectId, doc.projectId);
  return doc;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const doc = await assertDocAccess(id, auth, "viewer");
    return apiOk({
      document: {
        id: doc.publicId,
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
        version: doc.version,
        contentChecksum: doc.contentChecksum,
        sourcePath: doc.sourcePath,
        sourceFilename: doc.sourceFilename,
        sourceChecksum: doc.sourceChecksum,
        lastCliSyncAt: doc.lastCliSyncAt,
        updatedAt: doc.updatedAt,
        shareUrl: doc.status === "published" ? shareUrl(doc.publicId) : null,
        slug: doc.slug,
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof DocumentError) {
      return apiError(
        e.code === "FORBIDDEN" ? "FORBIDDEN" : "NOT_FOUND",
        e.message,
        e.code === "FORBIDDEN" ? 403 : 404
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const doc = await assertDocAccess(id, auth);
    const body = await req.json();

    const parsed = updateDocumentSchema.safeParse({
      title: body.title,
      description: body.description,
      markdownContent: body.markdownContent ?? body.content,
      visibility: body.visibility,
      status: body.status,
      password: body.password,
      clearPassword: body.clearPassword,
      theme: body.theme,
      contentWidth: body.contentWidth ?? body.width,
      fontStyle: body.fontStyle ?? body.font,
      showTableOfContents: body.showTableOfContents ?? body.toc,
      showCodeLineNumbers: body.showCodeLineNumbers ?? body.lineNumbers,
      baseVersion: body.baseVersion ?? body.version,
      force: body.force === true,
      sourcePath: body.sourcePath,
      sourceFilename: body.sourceFilename,
      sourceChecksum:
        body.sourceChecksum ??
        (body.markdownContent
          ? contentChecksum(body.markdownContent)
          : undefined),
      slug: body.slug,
    });

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input", 400, {
        issues: parsed.error.issues,
      });
    }

    const updated = await updateDocumentById(doc, parsed.data, {
      userId: auth.userId,
      source: "cli",
      deviceName: auth.deviceName,
    });

    return apiOk({
      document: {
        id: updated.publicId,
        title: updated.title,
        version: updated.version,
        status: updated.status,
        visibility: updated.visibility,
        shareUrl: shareUrl(updated.publicId),
        contentChecksum: contentChecksum(updated.markdownContent),
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof DocumentError) {
      if (e.code === "CONFLICT") {
        return apiError("DOCUMENT_CONFLICT", e.message, 409, {
          remoteVersion: undefined,
        });
      }
      return apiError(
        e.code === "FORBIDDEN" ? "FORBIDDEN" : "VALIDATION_ERROR",
        e.message,
        e.code === "FORBIDDEN" ? 403 : 400
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const doc = await assertDocAccess(id, auth);
    await softDeleteDocument(doc);
    return apiOk({ ok: true });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof DocumentError) return apiError("NOT_FOUND", e.message, 404);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

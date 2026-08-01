import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
  CliAuthError,
} from "@/lib/cli/tokens";
import { canAccessDocument } from "@/lib/projects/members";
import {
  DocumentError,
  getDocumentByPublicId,
  updateDocumentById,
} from "@/lib/documents/service";
import { shareUrl } from "@/lib/utils/urls";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req);
    const { id } = await ctx.params;
    const doc = await getDocumentByPublicId(id);
    if (!doc || !(await canAccessDocument(doc, auth.userId, "editor"))) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }
    assertScopeAllowsProject(auth.scope, auth.projectId, doc.projectId);
    const updated = await updateDocumentById(
      doc,
      { status: "published" },
      { userId: auth.userId, source: "cli", deviceName: auth.deviceName }
    );
    return apiOk({
      document: {
        id: updated.publicId,
        status: updated.status,
        shareUrl: shareUrl(updated.publicId),
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof DocumentError) return apiError("VALIDATION_ERROR", e.message, 400);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import {
  DocumentError,
  getDocumentByPublicId,
  listVersions,
} from "@/lib/documents/service";
import {
  assertCanUseVersionHistory,
  PlanError,
} from "@/lib/plans/service";

async function assertOwned(publicId: string, userId: string) {
  const doc = await getDocumentByPublicId(publicId);
  if (!doc) throw new DocumentError("Not found", "NOT_FOUND");
  if (doc.createdBy !== userId) {
    throw new DocumentError("Forbidden", "FORBIDDEN");
  }
  return doc;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    await assertCanUseVersionHistory(auth.userId);
    const { id } = await ctx.params;
    const doc = await assertOwned(id, auth.userId);
    const versions = await listVersions(doc.id);
    return apiOk({ versions }, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError(
        e.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
        e.message,
        e.status,
        {},
        requestId
      );
    }
    if (e instanceof PlanError) {
      return apiError("FEATURE_NOT_AVAILABLE", e.message, 403, {}, requestId);
    }
    if (e instanceof DocumentError) {
      return apiError(
        e.code === "FORBIDDEN" ? "FORBIDDEN" : "RESOURCE_NOT_FOUND",
        e.message,
        e.code === "FORBIDDEN" ? 403 : 404,
        {},
        requestId
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

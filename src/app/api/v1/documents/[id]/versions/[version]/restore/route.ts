import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import {
  DocumentError,
  getDocumentByPublicId,
  restoreVersion,
} from "@/lib/documents/service";
import {
  assertCanUseVersionHistory,
  PlanError,
} from "@/lib/plans/service";
import { writeAuditLog } from "@/lib/audit/service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; version: string }> }
) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    await assertCanUseVersionHistory(auth.userId);
    const { id, version } = await ctx.params;
    const doc = await getDocumentByPublicId(id);
    if (!doc || doc.createdBy !== auth.userId) {
      return apiError(
        "RESOURCE_NOT_FOUND",
        "Not found",
        404,
        {},
        requestId
      );
    }
    const v = Number(version);
    if (!Number.isFinite(v)) {
      return apiError("VALIDATION_ERROR", "Invalid version", 400, {}, requestId);
    }
    const updated = await restoreVersion(doc, v, auth.userId);
    await writeAuditLog({
      action: "document.restored",
      actorType: auth.actorType,
      userId: auth.userId,
      actorId: auth.userId,
      metadata: { publicId: id, version: v },
    });
    return apiOk({ document: updated }, 200, requestId);
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
      return apiError("RESOURCE_NOT_FOUND", e.message, 404, {}, requestId);
    }
    return apiError("INTERNAL_ERROR", "Restore failed", 500, {}, requestId);
  }
}

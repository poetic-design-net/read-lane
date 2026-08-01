import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  assertScopeAllowsProject,
  authenticateBearer,
  CliAuthError,
} from "@/lib/cli/tokens";
import { canAccessDocument } from "@/lib/projects/members";
import { getDocumentByPublicId } from "@/lib/documents/service";
import { createSignedManagementToken } from "@/lib/security/auth-session";
import { appConfig } from "@/lib/config";

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
    const token = await createSignedManagementToken(doc.publicId, auth.userId);
    return apiOk({
      manageUrl: `${appConfig.url}/manage/s/${token}`,
      expiresIn: appConfig.managementUrlTtlSeconds,
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

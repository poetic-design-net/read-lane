import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";
import {
  DocumentError,
  getDocumentByPublicId,
  updateDocumentById,
} from "@/lib/documents/service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const doc = await getDocumentByPublicId(id);
    if (!doc || doc.createdBy !== auth.userId) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }
    const updated = await updateDocumentById(
      doc,
      { status: "archived" },
      { userId: auth.userId, source: "cli", deviceName: auth.deviceName }
    );
    return apiOk({
      document: { id: updated.publicId, status: updated.status },
    });
  } catch (e) {
    if (e instanceof CliAuthError) return apiError("UNAUTHORIZED", e.message, 401);
    if (e instanceof DocumentError) return apiError("VALIDATION_ERROR", e.message, 400);
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

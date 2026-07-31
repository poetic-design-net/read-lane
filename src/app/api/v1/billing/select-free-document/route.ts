import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { BillingError, selectFreeDocument } from "@/lib/billing/service";

const schema = z.object({
  documentId: z.string().min(4),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "documentId required",
        400,
        {},
        requestId
      );
    }
    const result = await selectFreeDocument(
      auth.userId,
      parsed.data.documentId
    );
    return apiOk(result, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError("UNAUTHENTICATED", e.message, 401, {}, requestId);
    }
    if (e instanceof BillingError) {
      return apiError("RESOURCE_NOT_FOUND", e.message, 404, {}, requestId);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

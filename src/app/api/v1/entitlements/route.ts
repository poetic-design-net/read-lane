import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { getEntitlements } from "@/lib/plans/service";

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const result = await getEntitlements(auth.userId);
    return apiOk(result, 200, requestId);
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
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

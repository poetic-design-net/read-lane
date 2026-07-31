import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { getUsage } from "@/lib/plans/service";

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const usage = await getUsage(auth.userId);
    return apiOk(usage, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError("UNAUTHENTICATED", e.message, 401, {}, requestId);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

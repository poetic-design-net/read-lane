import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  authenticateBearer,
  listCliTokens,
  CliAuthError,
} from "@/lib/cli/tokens";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateBearer(req);
    const tokens = await listCliTokens(auth.userId);
    return apiOk({ tokens });
  } catch (e) {
    if (e instanceof CliAuthError) {
      return apiError("UNAUTHORIZED", e.message, 401);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

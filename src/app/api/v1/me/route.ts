import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    return apiOk({
      user: {
        email: auth.email,
        name: auth.name,
      },
    });
  } catch (e) {
    if (e instanceof CliAuthError) {
      return apiError("UNAUTHORIZED", e.message, 401);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

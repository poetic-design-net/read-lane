import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  authenticateBearer,
  revokeCliToken,
  CliAuthError,
} from "@/lib/cli/tokens";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateBearer(req.headers.get("authorization"));
    const { id } = await ctx.params;
    await revokeCliToken(auth.userId, id);
    return apiOk({ ok: true });
  } catch (e) {
    if (e instanceof CliAuthError) {
      return apiError("UNAUTHORIZED", e.message, 401);
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

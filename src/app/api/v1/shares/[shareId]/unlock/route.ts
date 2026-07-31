import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import {
  DocumentError,
  getPublicDocumentView,
} from "@/lib/documents/service";
import { verifyPassword } from "@/lib/security/passwords";
import { setUnlockSession } from "@/lib/security/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { appConfig } from "@/lib/config";

const schema = z.object({
  password: z.string().min(1).max(appConfig.limits.passwordMax),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ shareId: string }> }
) {
  const requestId = createRequestId();
  try {
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `share:unlock:${ip}`,
      appConfig.rateLimit.password.windowMs,
      appConfig.rateLimit.password.max
    );
    if (!rl.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many attempts",
        429,
        { retryAfter: Math.ceil(rl.resetMs / 1000) },
        requestId
      );
    }

    const { shareId } = await ctx.params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Password required",
        400,
        {},
        requestId
      );
    }

    const view = await getPublicDocumentView(shareId);
    if (!view.requiresPassword || !view.passwordHash) {
      return apiError(
        "VALIDATION_ERROR",
        "Document is not password protected",
        400,
        {},
        requestId
      );
    }

    const ok = await verifyPassword(parsed.data.password, view.passwordHash);
    if (!ok) {
      return apiError(
        "INVALID_PASSWORD",
        "Falsches Passwort",
        401,
        {},
        requestId
      );
    }

    await setUnlockSession(shareId);
    return apiOk({ unlocked: true }, 200, requestId);
  } catch (e) {
    if (e instanceof DocumentError) {
      return apiError(
        "RESOURCE_NOT_FOUND",
        "Dieses Dokument ist nicht verfügbar.",
        404,
        {},
        requestId
      );
    }
    return apiError("INTERNAL_ERROR", "Unexpected error", 500, {}, requestId);
  }
}

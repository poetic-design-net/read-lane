import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { loginUser, AuthError } from "@/lib/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { writeAuditLog } from "@/lib/audit/service";
import { appConfig } from "@/lib/config";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `auth:login:${ip}`,
      appConfig.rateLimit.auth.windowMs,
      appConfig.rateLimit.auth.max
    );
    if (!rl.success) {
      return apiError(
        "RATE_LIMITED",
        "Zu viele Anfragen. Bitte später erneut versuchen.",
        429,
        { retryAfter: Math.ceil(rl.resetMs / 1000) },
        requestId
      );
    }


    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "UNAUTHENTICATED",
        "E-Mail oder Passwort ungültig",
        401,
        {},
        requestId
      );
    }

    const user = await loginUser(parsed.data);
    await writeAuditLog({
      action: "user.login",
      actorType: "user",
      userId: user.id,
      actorId: user.id,
      ip,
    });

    return apiOk(
      { user: { id: user.id, email: user.email, name: user.name } },
      200,
      requestId
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return apiError(
        "UNAUTHENTICATED",
        "E-Mail oder Passwort ungültig",
        401,
        {},
        requestId
      );
    }
    console.error("[auth/login]", e);
    return apiError("INTERNAL_ERROR", "Login fehlgeschlagen", 500, {}, requestId);
  }
}

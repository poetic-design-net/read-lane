import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { registerUser, AuthError } from "@/lib/auth/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { writeAuditLog } from "@/lib/audit/service";
import { appConfig } from "@/lib/config";

const schema = z.object({
  email: z.string().email().max(appConfig.limits.emailMax),
  password: z
    .string()
    .min(appConfig.limits.passwordMin)
    .max(appConfig.limits.passwordMax),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `auth:register:${ip}`,
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
        "VALIDATION_ERROR",
        "Ungültige Eingabe",
        400,
        { issues: parsed.error.issues },
        requestId
      );
    }

    const user = await registerUser(parsed.data);
    await writeAuditLog({
      action: "user.login",
      actorType: "user",
      userId: user.id,
      actorId: user.id,
      ip,
      metadata: { via: "register" },
    });

    return apiOk(
      { user: { id: user.id, email: user.email, name: user.name } },
      201,
      requestId
    );
  } catch (e) {
    if (e instanceof AuthError) {
      const status = e.code === "EMAIL_TAKEN" ? 409 : 400;
      return apiError(
        e.code === "EMAIL_TAKEN" ? "VALIDATION_ERROR" : "VALIDATION_ERROR",
        e.message,
        status,
        {},
        requestId
      );
    }
    console.error("[auth/register]", e);
    return apiError("INTERNAL_ERROR", "Registrierung fehlgeschlagen", 500, {}, requestId);
  }
}

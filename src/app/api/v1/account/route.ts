import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { getDb } from "@/lib/db";
import { users, cliTokens } from "@/lib/db/schema";
import { destroySession } from "@/lib/security/auth-session";
import { writeAuditLog } from "@/lib/audit/service";
import { getEntitlements, getUsage } from "@/lib/plans/service";
import { hashSecret } from "@/lib/security/tokens";
import { appConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const { plan, entitlements } = await getEntitlements(auth.userId);
    const usage = await getUsage(auth.userId);
    return apiOk(
      {
        user: {
          email: auth.email,
          name: auth.name,
          plan,
        },
        entitlements,
        usage,
      },
      200,
      requestId
    );
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

const patchSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  password: z
    .string()
    .min(appConfig.limits.passwordMin)
    .max(appConfig.limits.passwordMax)
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Ungültige Eingabe",
        400,
        { issues: parsed.error.issues },
        requestId
      );
    }

    const db = getDb();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.password) {
      updates.passwordHash = await hashSecret(parsed.data.password);
      // Revoke all CLI tokens on password change
      await db
        .update(cliTokens)
        .set({ revokedAt: new Date() })
        .where(eq(cliTokens.userId, auth.userId));
      await writeAuditLog({
        action: "user.password_changed",
        actorType: "user",
        userId: auth.userId,
        actorId: auth.userId,
      });
    }

    await db.update(users).set(updates).where(eq(users.id, auth.userId));
    return apiOk({ ok: true }, 200, requestId);
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

export async function DELETE(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const db = getDb();
    await db
      .update(cliTokens)
      .set({ revokedAt: new Date() })
      .where(eq(cliTokens.userId, auth.userId));
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        email: `deleted+${auth.userId}@invalid.local`,
        name: null,
        passwordHash: await hashSecret(crypto.randomUUID()),
        updatedAt: new Date(),
      })
      .where(eq(users.id, auth.userId));
    await destroySession();
    await writeAuditLog({
      action: "user.account_deleted",
      actorType: "user",
      userId: auth.userId,
      actorId: auth.userId,
    });
    return apiOk({ ok: true }, 200, requestId);
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

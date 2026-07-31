import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import {
  BillingError,
  createBillingPortalSession,
} from "@/lib/billing/service";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);
    if (!user) {
      return apiError("UNAUTHENTICATED", "Not found", 401, {}, requestId);
    }

    const session = await createBillingPortalSession({
      id: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
    });
    return apiOk(session, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError("UNAUTHENTICATED", e.message, 401, {}, requestId);
    }
    if (e instanceof BillingError) {
      return apiError("STRIPE_ERROR", e.message, 501, {}, requestId);
    }
    return apiError("INTERNAL_ERROR", "Portal failed", 500, {}, requestId);
  }
}

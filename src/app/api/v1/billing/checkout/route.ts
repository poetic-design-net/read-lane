import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { requireAuth, ApiAuthError } from "@/lib/api/auth-context";
import { BillingError, createCheckoutSession } from "@/lib/billing/service";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

const schema = z.object({
  plan: z.enum(["pro", "business"]).default("pro"),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid plan/interval",
        400,
        { issues: parsed.error.issues },
        requestId
      );
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);
    if (!user) {
      return apiError("UNAUTHENTICATED", "Not found", 401, {}, requestId);
    }

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      plan: parsed.data.plan,
      interval: parsed.data.interval,
    });

    return apiOk(session, 200, requestId);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return apiError("UNAUTHENTICATED", e.message, 401, {}, requestId);
    }
    if (e instanceof BillingError) {
      return apiError(
        e.code === "NOT_CONFIGURED" ? "STRIPE_ERROR" : "STRIPE_ERROR",
        e.message,
        e.code === "NOT_CONFIGURED" ? 501 : 400,
        {},
        requestId
      );
    }
    console.error("[billing/checkout]", e);
    return apiError("INTERNAL_ERROR", "Checkout failed", 500, {}, requestId);
  }
}

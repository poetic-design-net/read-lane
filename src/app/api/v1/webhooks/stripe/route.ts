import { NextRequest } from "next/server";
import { apiError, apiOk, createRequestId } from "@/lib/api/errors";
import { BillingError, handleStripeWebhook } from "@/lib/billing/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const result = await handleStripeWebhook(rawBody, signature);
    return apiOk(result, 200, requestId);
  } catch (e) {
    if (e instanceof BillingError) {
      const status =
        e.code === "NOT_CONFIGURED"
          ? 501
          : e.code === "STRIPE_ERROR"
            ? 400
            : 500;
      return apiError("STRIPE_ERROR", e.message, status, {}, requestId);
    }
    console.error("[webhooks/stripe]", e);
    return apiError("INTERNAL_ERROR", "Webhook failed", 500, {}, requestId);
  }
}

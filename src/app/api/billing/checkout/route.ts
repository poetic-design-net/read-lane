import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/service";
import { appConfig } from "@/lib/config";

/**
 * Stripe Checkout scaffold (v2).
 * When STRIPE_SECRET_KEY + price IDs are set, creates a real session.
 * Otherwise returns a clear configuration message for local dev.
 */
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login?next=/dashboard/upgrade", appConfig.url));
  }

  const form = await req.formData().catch(() => null);
  const plan = String(form?.get("plan") ?? "pro");
  const interval = String(form?.get("interval") ?? "monthly");

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId =
    plan === "business"
      ? interval === "yearly"
        ? process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID
        : process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID
      : interval === "yearly"
        ? process.env.STRIPE_PRO_YEARLY_PRICE_ID
        : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!secret || !priceId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Stripe ist noch nicht konfiguriert. Setze STRIPE_SECRET_KEY und Price-IDs, oder setze users.plan in der DB manuell auf 'pro'.",
        plan,
        interval,
      },
      { status: 501 }
    );
  }

  // Real Stripe Checkout would go here (stripe.checkout.sessions.create)
  return NextResponse.json(
    {
      ok: false,
      error:
        "Stripe SDK noch nicht installiert. ENV ist gesetzt — bitte stripe Package ergänzen und Session erstellen.",
    },
    { status: 501 }
  );
}

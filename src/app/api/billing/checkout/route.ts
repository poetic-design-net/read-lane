import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/service";
import { appConfig } from "@/lib/config";
import { createCheckoutSession, BillingError } from "@/lib/billing/service";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Form POST from dashboard upgrade page.
 * Redirects to Stripe Checkout when configured.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.redirect(
      new URL("/login?next=/dashboard/upgrade", appConfig.url)
    );
  }

  const form = await req.formData().catch(() => null);
  const plan = String(form?.get("plan") ?? "pro") as "pro" | "business";
  const interval = String(form?.get("interval") ?? "monthly") as
    | "monthly"
    | "yearly";

  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    return NextResponse.redirect(new URL("/login", appConfig.url));
  }

  try {
    const session = await createCheckoutSession({
      userId: row.id,
      email: row.email,
      stripeCustomerId: row.stripeCustomerId,
      plan: plan === "business" ? "business" : "pro",
      interval: interval === "yearly" ? "yearly" : "monthly",
    });
    if (session.url) {
      return NextResponse.redirect(session.url);
    }
    return NextResponse.json(
      { ok: false, error: "No checkout URL" },
      { status: 500 }
    );
  } catch (e) {
    if (e instanceof BillingError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.code === "NOT_CONFIGURED" ? 501 : 400 }
      );
    }
    console.error("[billing/checkout form]", e);
    return NextResponse.json(
      { ok: false, error: "Checkout failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { stripeEvents, subscriptions, users } from "@/lib/db/schema";
import { planFromPriceId } from "@/lib/plans/config";

/**
 * Stripe webhook scaffold — idempotent event storage.
 * Wire signature verification when STRIPE_WEBHOOK_SECRET is set.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, error: "Stripe webhook not configured" },
      { status: 501 }
    );
  }

  // TODO: verify stripe signature with stripe.webhooks.constructEvent
  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id))
    .limit(1);
  if (existing[0]?.processedAt) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await db
    .insert(stripeEvents)
    .values({
      stripeEventId: event.id,
      eventType: event.type,
    })
    .onConflictDoNothing();

  // Minimal handling stubs
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const obj = event.data.object;
    const customerId = String(obj.customer ?? "");
    const priceId = String(
      (obj.items as { data?: { price?: { id?: string } }[] })?.data?.[0]?.price
        ?.id ?? ""
    );
    const plan = planFromPriceId(priceId);
    const status = String(obj.status ?? "active");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (user) {
      await db
        .update(users)
        .set({ plan, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      await db.insert(subscriptions).values({
        userId: user.id,
        plan,
        status: status as "active",
        stripeSubscriptionId: String(obj.id ?? ""),
        stripePriceId: priceId || null,
      });
    }
  }

  await db
    .update(stripeEvents)
    .set({ processedAt: new Date() })
    .where(eq(stripeEvents.stripeEventId, event.id));

  return NextResponse.json({ ok: true });
}

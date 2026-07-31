/**
 * BillingService — Stripe checkout, portal, webhooks, downgrade.
 */

import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { getDb } from "@/lib/db";
import {
  freeDocumentSelections,
  stripeEvents,
  subscriptions,
  users,
  documents,
} from "@/lib/db/schema";
import { appConfig } from "@/lib/config";
import {
  planFromPriceId,
  priceIdFor,
  type PlanId,
} from "@/lib/plans/config";
import {
  archiveOtherActiveDocuments,
  getActiveDocument,
} from "@/lib/plans/service";
import { writeAuditLog } from "@/lib/audit/service";
import { isStripeConfigured } from "@/lib/env";

export class BillingError extends Error {
  constructor(
    message: string,
    public code: "NOT_CONFIGURED" | "STRIPE_ERROR" | "NOT_FOUND" | "VALIDATION"
  ) {
    super(message);
    this.name = "BillingError";
  }
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingError("Stripe not configured", "NOT_CONFIGURED");
  return new Stripe(key);
}


export async function ensureStripeCustomer(user: {
  id: string;
  email: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  const db = getDb();
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return customer.id;
}

export async function createCheckoutSession(input: {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  plan: "pro" | "business";
  interval: "monthly" | "yearly";
}) {
  if (!isStripeConfigured()) {
    throw new BillingError("Stripe is not configured", "NOT_CONFIGURED");
  }
  const priceId = priceIdFor(input.plan, input.interval);
  if (!priceId) {
    throw new BillingError("Price ID missing for plan/interval", "NOT_CONFIGURED");
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer({
    id: input.userId,
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appConfig.url}/dashboard/upgrade?success=1`,
    cancel_url: `${appConfig.url}/dashboard/upgrade?canceled=1`,
    metadata: {
      userId: input.userId,
      plan: input.plan,
      interval: input.interval,
    },
    subscription_data: {
      metadata: { userId: input.userId, plan: input.plan },
    },
    allow_promotion_codes: true,
  });

  await writeAuditLog({
    action: "billing.checkout_started",
    actorType: "user",
    userId: input.userId,
    actorId: input.userId,
    metadata: { plan: input.plan, interval: input.interval },
  });

  return { url: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(user: {
  id: string;
  email: string;
  stripeCustomerId: string | null;
}) {
  if (!isStripeConfigured()) {
    throw new BillingError("Stripe is not configured", "NOT_CONFIGURED");
  }
  const customerId = await ensureStripeCustomer(user);
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appConfig.url}/dashboard/settings`,
  });
  return { url: session.url };
}

export async function getSubscriptionForUser(userId: string) {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

export async function selectFreeDocument(
  userId: string,
  documentPublicId: string
) {
  const db = getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.publicId, documentPublicId),
        eq(documents.createdBy, userId)
      )
    )
    .limit(1);
  if (!doc) {
    throw new BillingError("Document not found", "NOT_FOUND");
  }

  await db
    .insert(freeDocumentSelections)
    .values({
      userId,
      documentPublicId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: freeDocumentSelections.userId,
      set: { documentPublicId, updatedAt: new Date() },
    });

  return { documentPublicId };
}

/**
 * Apply free-tier compliance after paid period ends (idempotent).
 */
export async function applyDowngradeToFree(userId: string) {
  const db = getDb();
  const [selection] = await db
    .select()
    .from(freeDocumentSelections)
    .where(eq(freeDocumentSelections.userId, userId))
    .limit(1);

  let keepId = selection?.documentPublicId;
  if (!keepId) {
    const active = await getActiveDocument(userId);
    keepId = active?.publicId;
  }
  if (!keepId) {
    // nothing to keep
    await db
      .update(users)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { kept: null };
  }

  await archiveOtherActiveDocuments(userId, keepId);
  await db
    .update(users)
    .set({ plan: "free", updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAuditLog({
    action: "subscription.downgraded",
    actorType: "system",
    userId,
    metadata: { keptDocumentPublicId: keepId },
  });

  return { kept: keepId };
}

function payloadHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null
) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    throw new BillingError("Stripe webhook not configured", "NOT_CONFIGURED");
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new BillingError("Invalid Stripe signature", "STRIPE_ERROR");
  }

  const db = getDb();
  const hash = payloadHash(rawBody);

  const [existing] = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id))
    .limit(1);

  if (existing?.status === "processed") {
    return { ok: true, duplicate: true };
  }

  if (!existing) {
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      payloadHash: hash,
      status: "processing",
    });
  } else {
    await db
      .update(stripeEvents)
      .set({ status: "processing", errorMessage: null })
      .where(eq(stripeEvents.stripeEventId, event.id));
  }

  try {
    await processStripeEvent(event);
    await db
      .update(stripeEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(stripeEvents.stripeEventId, event.id));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await db
      .update(stripeEvents)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(stripeEvents.stripeEventId, event.id));
    throw e;
  }
}

async function processStripeEvent(event: Stripe.Event) {
  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || session.mode !== "subscription") return;
      // Subscription details arrive via customer.subscription.* as well
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = String(sub.customer);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
      if (!user) return;

      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      await applyDowngradeToFree(user.id);
      break;
    }
    case "invoice.paid": {
      // keep plan active — subscription.updated handles details
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer ?? "");
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
      if (!user) return;
      await db
        .update(subscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(subscriptions.userId, user.id));
      break;
    }
    default:
      break;
  }
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const db = getDb();
  const customerId = String(sub.customer);
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const plan: PlanId = planFromPriceId(priceId);
  const interval =
    sub.items.data[0]?.price?.recurring?.interval === "year"
      ? "yearly"
      : "monthly";

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  // Fallback: metadata.userId
  if (!user && sub.metadata?.userId) {
    [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sub.metadata.userId))
      .limit(1);
    if (user && !user.stripeCustomerId) {
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }
  if (!user) return;

  const status = mapStripeStatus(sub.status);
  // Stripe SDK types vary by version — read period fields defensively
  const subRaw = sub as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart = subRaw.current_period_start
    ? new Date(subRaw.current_period_start * 1000)
    : null;
  const periodEnd = subRaw.current_period_end
    ? new Date(subRaw.current_period_end * 1000)
    : null;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan,
        status,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        billingInterval: interval,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId: user.id,
      plan,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      billingInterval: interval,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    });
  }

  // Cache plan on user while paid period is active
  if (status === "active" || status === "trialing" || status === "past_due") {
    if (plan === "pro" || plan === "business") {
      const prev = user.plan;
      await db
        .update(users)
        .set({ plan, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      if (prev === "free") {
        await writeAuditLog({
          action: "subscription.upgraded",
          actorType: "stripe",
          userId: user.id,
          metadata: { plan, status },
        });
      }
    }
  }

  // Period ended with cancel
  if (
    sub.cancel_at_period_end &&
    periodEnd &&
    periodEnd < new Date() &&
    (status === "canceled" || status === "unpaid")
  ) {
    await applyDowngradeToFree(user.id);
  }
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
):
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    case "unpaid":
      return "unpaid";
    case "paused":
      return "canceled";
    default:
      return "active";
  }
}

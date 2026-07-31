import { and, count, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, subscriptions, users } from "@/lib/db/schema";
import { planConfig, type PlanId } from "./config";

export class PlanError extends Error {
  constructor(
    message: string,
    public code:
      | "PLAN_LIMIT"
      | "FEATURE_LOCKED"
      | "UPGRADE_REQUIRED"
      | "FORBIDDEN"
  ) {
    super(message);
    this.name = "PlanError";
  }
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const db = getDb();

  // Prefer active Stripe subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  if (sub && (sub.plan === "pro" || sub.plan === "business")) {
    // Honor paid period even if cancel_at_period_end
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
      // period ended
    } else {
      return sub.plan;
    }
  }

  const [trialing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "trialing")
      )
    )
    .limit(1);
  if (trialing?.plan === "pro" || trialing?.plan === "business") {
    return trialing.plan;
  }

  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (user?.plan as PlanId) ?? "free";
}

export async function getPlanLimits(userId: string) {
  const plan = await getUserPlan(userId);
  return { plan, limits: planConfig[plan] };
}

/** Active = published and not deleted/archived */
export async function countActiveDocuments(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(documents)
    .where(
      and(
        eq(documents.createdBy, userId),
        eq(documents.status, "published"),
        isNull(documents.deletedAt),
        isNull(documents.archivedAt)
      )
    );
  return Number(row?.n ?? 0);
}

export async function getActiveDocument(userId: string) {
  const db = getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.createdBy, userId),
        eq(documents.status, "published"),
        isNull(documents.deletedAt),
        isNull(documents.archivedAt)
      )
    )
    .limit(1);
  return doc ?? null;
}

/**
 * Free users: only one active document.
 * Creating another published doc requires replace or upgrade.
 */
export async function assertCanCreateActiveDocument(
  userId: string,
  opts?: { replaceExisting?: boolean }
) {
  const { plan, limits } = await getPlanLimits(userId);
  if (limits.activeDocuments === Infinity) return { plan, limits };

  const active = await countActiveDocuments(userId);
  if (active >= limits.activeDocuments && !opts?.replaceExisting) {
    throw new PlanError(
      "Dein kostenloser Link ist bereits belegt. Ersetze das bestehende Dokument oder upgrade auf Pro.",
      "UPGRADE_REQUIRED"
    );
  }
  return { plan, limits };
}

export async function assertCanUseProjects(userId: string) {
  const { plan, limits } = await getPlanLimits(userId);
  if (limits.projects === 0) {
    throw new PlanError(
      "Projekte sind ab dem Pro-Tarif verfügbar.",
      "UPGRADE_REQUIRED"
    );
  }
  return { plan, limits };
}

export async function assertCanUsePassword(userId: string) {
  const { plan, limits } = await getPlanLimits(userId);
  if (!limits.passwordProtection) {
    throw new PlanError(
      "Passwortschutz ist ab dem Pro-Tarif verfügbar.",
      "FEATURE_LOCKED"
    );
  }
  return { plan, limits };
}

export async function assertCanUseVersionHistory(userId: string) {
  const { plan, limits } = await getPlanLimits(userId);
  if (!limits.versionHistory) {
    throw new PlanError(
      "Versionsverlauf ist ab dem Pro-Tarif verfügbar.",
      "FEATURE_LOCKED"
    );
  }
  return { plan, limits };
}

/** For free: archive all but keepOnePublicId when forcing free compliance */
export async function archiveOtherActiveDocuments(
  userId: string,
  keepPublicId: string
) {
  const db = getDb();
  await db
    .update(documents)
    .set({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.createdBy, userId),
        eq(documents.status, "published"),
        isNull(documents.deletedAt),
        ne(documents.publicId, keepPublicId)
      )
    );
}

import { and, count, eq, isNull, ne, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, files, subscriptions, users } from "@/lib/db/schema";
import {
  planConfig,
  planLimits,
  type Entitlements,
  type PlanId,
  type RendererType,
} from "./config";

export class PlanError extends Error {
  constructor(
    message: string,
    public code:
      | "PLAN_LIMIT"
      | "FEATURE_LOCKED"
      | "UPGRADE_REQUIRED"
      | "FORBIDDEN"
      | "STORAGE_LIMIT"
      | "FILE_TOO_LARGE"
  ) {
    super(message);
    this.name = "PlanError";
  }
}

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function getUserPlan(userId: string): Promise<PlanId> {
  const db = getDb();

  const [user] = await db
    .select({ plan: users.plan, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Platform admins always get business entitlements
  if (user?.isAdmin) return "business";

  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(5);

  for (const sub of subs) {
    if (!PAID_STATUSES.has(sub.status)) continue;
    if (sub.plan !== "pro" && sub.plan !== "business") continue;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) continue;
    return sub.plan;
  }

  return (user?.plan as PlanId) ?? "free";
}


/** EntitlementService — single source of truth for feature gates */
export async function getEntitlements(userId: string): Promise<{
  plan: PlanId;
  entitlements: Entitlements;
}> {
  const plan = await getUserPlan(userId);
  return { plan, entitlements: planLimits[plan] };
}

export async function getPlanLimits(userId: string) {
  const plan = await getUserPlan(userId);
  return { plan, limits: planConfig[plan] };
}

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

export async function countProjects(userId: string): Promise<number> {
  const db = getDb();
  const { projects } = await import("@/lib/db/schema");
  const [row] = await db
    .select({ n: count() })
    .from(projects)
    .where(
      and(eq(projects.ownerId, userId), isNull(projects.archivedAt))
    );
  return Number(row?.n ?? 0);
}

export async function getStorageUsageBytes(userId: string): Promise<number> {
  const db = getDb();
  // Prefer files table if present; fall back to documents.fileSize
  try {
    const [fileRow] = await db
      .select({ total: sum(files.fileSize) })
      .from(files)
      .where(and(eq(files.ownerId, userId), isNull(files.deletedAt)));
    const fromFiles = Number(fileRow?.total ?? 0);
    if (fromFiles > 0) return fromFiles;
  } catch {
    // table may not exist yet during migration
  }

  const [docRow] = await db
    .select({ total: sum(documents.fileSize) })
    .from(documents)
    .where(and(eq(documents.createdBy, userId), isNull(documents.deletedAt)));
  return Number(docRow?.total ?? 0);
}

export async function getUsage(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  const [activeDocuments, projects, storageBytes] = await Promise.all([
    countActiveDocuments(userId),
    countProjects(userId),
    getStorageUsageBytes(userId),
  ]);
  return {
    plan,
    activeDocuments,
    projects,
    storageBytes,
    maxActiveDocuments: entitlements.maxActiveDocuments,
    maxProjects: entitlements.maxProjects,
    maxStorageBytes: entitlements.maxStorageBytes,
    maxFileSizeBytes: entitlements.maxFileSizeBytes,
  };
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

export async function assertCanCreateProject(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (entitlements.maxProjects === 0) {
    throw new PlanError(
      "Projekte sind ab dem Pro-Tarif verfügbar.",
      "UPGRADE_REQUIRED"
    );
  }
  if (entitlements.maxProjects != null) {
    const n = await countProjects(userId);
    if (n >= entitlements.maxProjects) {
      throw new PlanError("Projektlimit erreicht.", "PLAN_LIMIT");
    }
  }
  return { plan, entitlements };
}

export async function assertCanCreateDocument(
  userId: string,
  opts?: { replaceExisting?: boolean }
) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (entitlements.maxActiveDocuments == null) {
    return { plan, entitlements };
  }
  const active = await countActiveDocuments(userId);
  if (active >= entitlements.maxActiveDocuments && !opts?.replaceExisting) {
    throw new PlanError(
      "Dein kostenloser Link ist bereits belegt. Ersetze das bestehende Dokument oder upgrade auf Pro.",
      "UPGRADE_REQUIRED"
    );
  }
  return { plan, entitlements };
}

/** @deprecated use assertCanCreateDocument */
export async function assertCanCreateActiveDocument(
  userId: string,
  opts?: { replaceExisting?: boolean }
) {
  const r = await assertCanCreateDocument(userId, opts);
  return { plan: r.plan, limits: planConfig[r.plan] };
}

export async function assertCanUseProjects(userId: string) {
  return assertCanCreateProject(userId);
}

export async function assertCanUsePasswordProtection(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (!entitlements.passwordProtection) {
    throw new PlanError(
      "Passwortschutz ist ab dem Pro-Tarif verfügbar.",
      "FEATURE_LOCKED"
    );
  }
  return { plan, entitlements };
}

export async function assertCanUsePassword(userId: string) {
  const r = await assertCanUsePasswordProtection(userId);
  return { plan: r.plan, limits: planConfig[r.plan] };
}

export async function assertCanUseVersionHistory(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (!entitlements.versionHistory) {
    throw new PlanError(
      "Versionsverlauf ist ab dem Pro-Tarif verfügbar.",
      "FEATURE_LOCKED"
    );
  }
  return { plan, entitlements };
}

export async function assertCanUseRenderer(
  userId: string,
  rendererType: RendererType
) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (!entitlements.allowedRendererTypes.includes(rendererType)) {
    throw new PlanError(
      `Dateityp „${rendererType}“ ist in deinem Tarif nicht verfügbar.`,
      "FEATURE_LOCKED"
    );
  }
  return { plan, entitlements };
}

export async function assertCanUseCliProjectSync(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (!entitlements.cliProjects) {
    throw new PlanError(
      "CLI-Projektsync ist ab dem Pro-Tarif verfügbar.",
      "UPGRADE_REQUIRED"
    );
  }
  return { plan, entitlements };
}

export async function assertCanUseCliPushAll(userId: string) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (!entitlements.cliPushAll) {
    throw new PlanError(
      "push --all ist ab dem Pro-Tarif verfügbar.",
      "UPGRADE_REQUIRED"
    );
  }
  return { plan, entitlements };
}

export async function assertWithinFileSize(
  userId: string,
  sizeBytes: number
) {
  const { plan, entitlements } = await getEntitlements(userId);
  if (sizeBytes > entitlements.maxFileSizeBytes) {
    throw new PlanError(
      `Datei zu groß (max. ${Math.round(entitlements.maxFileSizeBytes / 1024 / 1024)} MB).`,
      "FILE_TOO_LARGE"
    );
  }
  return { plan, entitlements };
}

export async function assertWithinStorageLimit(
  userId: string,
  additionalBytes: number
) {
  const { plan, entitlements } = await getEntitlements(userId);
  const used = await getStorageUsageBytes(userId);
  if (used + additionalBytes > entitlements.maxStorageBytes) {
    throw new PlanError(
      "Speicherlimit erreicht. Upgrade oder lösche Dateien.",
      "STORAGE_LIMIT"
    );
  }
  return { plan, entitlements, used };
}

export async function assertPlanFeature(
  userId: string,
  feature: keyof Entitlements
) {
  const { plan, entitlements } = await getEntitlements(userId);
  const value = entitlements[feature];
  if (value === false || value === 0) {
    throw new PlanError(
      "Diese Funktion ist in deinem Tarif nicht verfügbar.",
      "FEATURE_LOCKED"
    );
  }
  return { plan, entitlements };
}

/** On free compliance / downgrade: archive all but one document */
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

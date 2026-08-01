/**
 * Custom domains (v2.md §14 Business, backend.md §55 Phase 6).
 *
 * Ownership is proven with a TXT record; the domain itself must be pointed at
 * the app in the hosting provider. ponytail: no provider API call here — the
 * certificate is issued by whoever hosts the app, and wiring the Vercel API in
 * would need a deploy token this app does not have.
 */

import { promises as dns } from "dns";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customDomains, projects } from "@/lib/db/schema";
import { assertPlanFeature } from "@/lib/plans/service";
import { assertProjectAccess } from "@/lib/projects/service";
import { createSharePublicId, createRandomToken } from "@/lib/security/tokens";
import { writeAuditLog } from "@/lib/audit/service";

export const VERIFICATION_PREFIX = "_readlane-verify";

export class DomainError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "UNVERIFIED"
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/** Hostnames only — no scheme, no path, no port. */
export function normalizeHost(input: string): string {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    throw new DomainError("Keine gültige Domain", "VALIDATION");
  }
  return host;
}

export async function listDomains(userId: string) {
  const db = getDb();
  return db
    .select({
      publicId: customDomains.publicId,
      host: customDomains.host,
      verificationToken: customDomains.verificationToken,
      verifiedAt: customDomains.verifiedAt,
      brandName: customDomains.brandName,
      brandColor: customDomains.brandColor,
      brandLogoUrl: customDomains.brandLogoUrl,
      projectName: projects.name,
    })
    .from(customDomains)
    .leftJoin(projects, eq(projects.id, customDomains.projectId))
    .where(eq(customDomains.userId, userId));
}

export async function addDomain(
  userId: string,
  input: { host: string; projectPublicId?: string | null }
) {
  await assertPlanFeature(userId, "customDomains");
  const host = normalizeHost(input.host);

  let projectId: string | null = null;
  if (input.projectPublicId) {
    const project = await assertProjectAccess(
      input.projectPublicId,
      userId,
      "owner"
    );
    projectId = project.id;
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: customDomains.id })
    .from(customDomains)
    .where(eq(customDomains.host, host))
    .limit(1);
  if (existing) {
    throw new DomainError("Diese Domain ist bereits vergeben", "CONFLICT");
  }

  const [row] = await db
    .insert(customDomains)
    .values({
      publicId: `dom_${createSharePublicId()}`,
      userId,
      projectId,
      host,
      verificationToken: `readlane-verify=${createRandomToken().slice(0, 32)}`,
    })
    .returning();

  return row!;
}

/**
 * Looks up the TXT record and marks the domain verified when it matches.
 * Verification is re-runnable: a record that disappears is not re-checked
 * automatically, so a lost record keeps working until someone re-verifies.
 */
export async function verifyDomain(userId: string, publicId: string) {
  const db = getDb();
  const domain = await getOwnedDomain(userId, publicId);

  let records: string[][] = [];
  try {
    records = await dns.resolveTxt(`${VERIFICATION_PREFIX}.${domain.host}`);
  } catch {
    throw new DomainError(
      "TXT-Eintrag nicht gefunden. DNS-Änderungen brauchen manchmal einige Minuten.",
      "UNVERIFIED"
    );
  }

  const values = records.map((parts) => parts.join("").trim());
  if (!values.includes(domain.verificationToken)) {
    throw new DomainError(
      "TXT-Eintrag stimmt nicht mit dem erwarteten Wert überein.",
      "UNVERIFIED"
    );
  }

  const [updated] = await db
    .update(customDomains)
    .set({ verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(customDomains.id, domain.id))
    .returning();

  await writeAuditLog({
    action: "domain.verified",
    actorType: "user",
    userId,
    actorId: userId,
    metadata: { host: domain.host },
  });

  return updated!;
}

export async function updateDomainBranding(
  userId: string,
  publicId: string,
  input: {
    brandName?: string | null;
    brandColor?: string | null;
    brandLogoUrl?: string | null;
  }
) {
  const domain = await getOwnedDomain(userId, publicId);
  const db = getDb();
  const [updated] = await db
    .update(customDomains)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customDomains.id, domain.id))
    .returning();
  return updated!;
}

export async function removeDomain(userId: string, publicId: string) {
  const domain = await getOwnedDomain(userId, publicId);
  const db = getDb();
  await db.delete(customDomains).where(eq(customDomains.id, domain.id));
}

/** Verified domain for an incoming request host, or null. */
export async function getVerifiedDomainByHost(host: string) {
  const clean = host.split(":")[0]?.toLowerCase();
  if (!clean) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(customDomains)
    .where(
      and(
        eq(customDomains.host, clean),
        isNotNull(customDomains.verifiedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

/** Verified domain a document should be shared under, or null. */
export async function getDomainForDocument(doc: {
  createdBy: string | null;
  projectId: string | null;
}) {
  if (!doc.createdBy) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(customDomains)
    .where(
      and(
        eq(customDomains.userId, doc.createdBy),
        isNotNull(customDomains.verifiedAt)
      )
    );
  if (rows.length === 0) return null;
  // A project domain wins over the account-wide one.
  return (
    rows.find((r) => r.projectId && r.projectId === doc.projectId) ??
    rows.find((r) => !r.projectId) ??
    null
  );
}

async function getOwnedDomain(userId: string, publicId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(customDomains)
    .where(
      and(
        eq(customDomains.publicId, publicId),
        eq(customDomains.userId, userId)
      )
    )
    .limit(1);
  if (!row) throw new DomainError("Domain nicht gefunden", "NOT_FOUND");
  return row;
}

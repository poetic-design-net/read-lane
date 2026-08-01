import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { createHash } from "crypto";

export type AuditAction =
  | "user.login"
  | "user.password_changed"
  | "user.account_deleted"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "subscription.canceled"
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.deleted"
  | "project.member_added"
  | "project.member_role_changed"
  | "project.member_removed"
  | "document.created"
  | "document.updated"
  | "document.replaced"
  | "document.published"
  | "document.archived"
  | "document.restored"
  | "document.deleted"
  | "document.password_enabled"
  | "document.password_disabled"
  | "document.share_link_rotated"
  | "cli.device_approved"
  | "cli.device_revoked"
  | "domain.verified"
  | "api_token.created"
  | "api_token.revoked"
  | "file.uploaded"
  | "billing.checkout_started";

export type ActorType = "user" | "cli" | "api" | "system" | "stripe";

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Strip secrets from metadata before persistence */
function sanitizeMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!meta) return null;
  const blocked = [
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
    "session",
    "markdownContent",
    "content",
    "passwordHash",
  ];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (blocked.some((b) => k.toLowerCase().includes(b.toLowerCase()))) {
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Newest first, for the account's own audit view (Business). */
export async function listAuditLogs(userId: string, limit = 100) {
  const db = getDb();
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorType: auditLogs.actorType,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(limit, 500));
}

export async function writeAuditLog(input: {
  action: AuditAction;
  actorType: ActorType;
  actorId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  documentId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      userId: input.userId ?? null,
      projectId: input.projectId ?? null,
      documentId: input.documentId ?? null,
      metadata: sanitizeMetadata(input.metadata)
        ? JSON.stringify(sanitizeMetadata(input.metadata))
        : null,
      ipHash: hashIp(input.ip),
    });
  } catch (e) {
    // Never fail the main request because of audit
    console.error("[audit] failed to write log", e);
  }
}

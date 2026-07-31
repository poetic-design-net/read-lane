import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cliDeviceCodes, cliTokens, users } from "@/lib/db/schema";
import { appConfig } from "@/lib/config";
import {
  createCliTokenPlain,
  createCliTokenPublicId,
  createDeviceCode,
  createUserCode,
  sha256,
} from "@/lib/security/tokens";

export class CliAuthError extends Error {
  constructor(
    message: string,
    public code:
      | "PENDING"
      | "DENIED"
      | "EXPIRED"
      | "INVALID"
      | "REVOKED"
      | "UNAUTHORIZED"
  ) {
    super(message);
    this.name = "CliAuthError";
  }
}

export async function startDeviceFlow(meta: {
  deviceName?: string;
  operatingSystem?: string;
}) {
  const db = getDb();
  const deviceCode = createDeviceCode();
  const userCode = createUserCode();

  await db.insert(cliDeviceCodes).values({
    deviceCodeHash: sha256(deviceCode),
    userCode,
    deviceName: meta.deviceName ?? null,
    operatingSystem: meta.operatingSystem ?? null,
    status: "pending",
    expiresAt: new Date(Date.now() + appConfig.deviceCodeTtlSeconds * 1000),
  });

  return {
    deviceCode,
    userCode,
    verificationUrl: `${appConfig.url.replace(/\/+$/, "")}/cli/authorize?code=${encodeURIComponent(userCode)}`,
    expiresIn: appConfig.deviceCodeTtlSeconds,
    interval: 3,
  };
}

export async function approveDeviceCode(userCode: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(cliDeviceCodes)
    .where(eq(cliDeviceCodes.userCode, userCode.toUpperCase()))
    .limit(1);

  const row = rows[0];
  if (!row) throw new CliAuthError("Code ungültig", "INVALID");
  if (row.expiresAt.getTime() < Date.now()) {
    await db
      .update(cliDeviceCodes)
      .set({ status: "expired" })
      .where(eq(cliDeviceCodes.id, row.id));
    throw new CliAuthError("Code abgelaufen", "EXPIRED");
  }
  if (row.status !== "pending") {
    throw new CliAuthError("Code bereits verwendet", "INVALID");
  }

  const plain = createCliTokenPlain();
  const publicId = createCliTokenPublicId();
  const expiresAt = new Date(
    Date.now() + appConfig.cliTokenDefaultTtlDays * 24 * 60 * 60 * 1000
  );

  await db.insert(cliTokens).values({
    publicId,
    userId,
    tokenHash: sha256(plain),
    name: "CLI",
    deviceName: row.deviceName,
    operatingSystem: row.operatingSystem,
    scope: "full",
    expiresAt,
  });

  await db
    .update(cliDeviceCodes)
    .set({
      status: "approved",
      userId,
      approvedAt: new Date(),
      issuedTokenPlain: plain,
    })
    .where(eq(cliDeviceCodes.id, row.id));

  return { ok: true as const };
}

export async function denyDeviceCode(userCode: string) {
  const db = getDb();
  await db
    .update(cliDeviceCodes)
    .set({ status: "denied" })
    .where(eq(cliDeviceCodes.userCode, userCode.toUpperCase()));
}

export async function pollDeviceCode(deviceCode: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(cliDeviceCodes)
    .where(eq(cliDeviceCodes.deviceCodeHash, sha256(deviceCode)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new CliAuthError("Ungültiger device code", "INVALID");
  if (row.expiresAt.getTime() < Date.now()) {
    throw new CliAuthError("Abgelaufen", "EXPIRED");
  }
  if (row.status === "pending") {
    throw new CliAuthError("Warte auf Bestätigung", "PENDING");
  }
  if (row.status === "denied") {
    throw new CliAuthError("Abgelehnt", "DENIED");
  }
  if (row.status === "approved" && row.issuedTokenPlain) {
    const token = row.issuedTokenPlain;
    // Clear plaintext after one-time delivery
    await db
      .update(cliDeviceCodes)
      .set({ issuedTokenPlain: null })
      .where(eq(cliDeviceCodes.id, row.id));
    return { accessToken: token, tokenType: "Bearer" as const };
  }
  throw new CliAuthError("Ungültiger Status", "INVALID");
}

export async function authenticateBearer(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new CliAuthError("Missing token", "UNAUTHORIZED");
  }
  // Also support READLANE_TOKEN via raw value without Bearer when passed directly
  const token = authorization.slice("Bearer ".length).trim();
  return authenticateCliToken(token);
}

export async function authenticateCliToken(token: string) {
  const db = getDb();
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  const rows = await db
    .select({
      token: cliTokens,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
      },
    })
    .from(cliTokens)
    .innerJoin(users, eq(users.id, cliTokens.userId))
    .where(
      and(
        eq(cliTokens.tokenHash, sha256(clean)),
        isNull(cliTokens.revokedAt),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new CliAuthError("Ungültiger Token", "UNAUTHORIZED");
  if (row.token.expiresAt && row.token.expiresAt.getTime() < Date.now()) {
    throw new CliAuthError("Token abgelaufen", "EXPIRED");
  }

  await db
    .update(cliTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliTokens.id, row.token.id));

  return {
    userId: row.user.id,
    email: row.user.email,
    name: row.user.name,
    tokenId: row.token.id,
    tokenPublicId: row.token.publicId,
    scope: row.token.scope,
    projectId: row.token.projectId,
    deviceName: row.token.deviceName,
  };
}

export async function listCliTokens(userId: string) {
  const db = getDb();
  return db
    .select({
      publicId: cliTokens.publicId,
      name: cliTokens.name,
      deviceName: cliTokens.deviceName,
      operatingSystem: cliTokens.operatingSystem,
      lastUsedAt: cliTokens.lastUsedAt,
      expiresAt: cliTokens.expiresAt,
      createdAt: cliTokens.createdAt,
      revokedAt: cliTokens.revokedAt,
      scope: cliTokens.scope,
    })
    .from(cliTokens)
    .where(and(eq(cliTokens.userId, userId), isNull(cliTokens.revokedAt)))
    .orderBy(sql`${cliTokens.createdAt} desc`);
}

export async function revokeCliToken(userId: string, tokenPublicId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(cliTokens)
    .where(
      and(eq(cliTokens.publicId, tokenPublicId), eq(cliTokens.userId, userId))
    )
    .limit(1);
  if (!rows[0]) throw new CliAuthError("Token nicht gefunden", "INVALID");
  await db
    .update(cliTokens)
    .set({ revokedAt: new Date() })
    .where(eq(cliTokens.id, rows[0].id));
}

export async function createProjectScopedToken(input: {
  userId: string;
  projectId: string;
  name: string;
  scope: "project_read" | "project_write" | "project_publish";
  expiresAt?: Date | null;
}) {
  const plain = createCliTokenPlain();
  const publicId = createCliTokenPublicId();
  const db = getDb();
  await db.insert(cliTokens).values({
    publicId,
    userId: input.userId,
    tokenHash: sha256(plain),
    name: input.name,
    projectId: input.projectId,
    scope: input.scope,
    expiresAt: input.expiresAt ?? null,
  });
  return { publicId, token: plain };
}

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  magicLinkTokens,
  passwordResetTokens,
  users,
} from "@/lib/db/schema";
import { appConfig } from "@/lib/config";
import {
  createRandomToken,
  hashSecret,
  sha256,
  verifySecret,
} from "@/lib/security/tokens";
import {
  createSession,
  destroySession,
  getSession,
} from "@/lib/security/auth-session";

export class AuthError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_CREDENTIALS"
      | "EMAIL_TAKEN"
      | "NOT_FOUND"
      | "INVALID_TOKEN"
      | "UNAUTHORIZED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const db = getDb();
  const email = input.email.toLowerCase().trim();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (existing[0]) {
    throw new AuthError("E-Mail ist bereits registriert", "EMAIL_TAKEN");
  }

  const passwordHash = await hashSecret(input.password);
  const { createSharePublicId } = await import("@/lib/security/tokens");
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name?.trim() || null,
      publicId: `usr_${createSharePublicId()}`,
    })
    .returning();


  if (!user) throw new AuthError("Registrierung fehlgeschlagen", "NOT_FOUND");

  await createSession({ userId: user.id, email: user.email });
  return { id: user.id, email: user.email, name: user.name };
}

export async function loginUser(input: { email: string; password: string }) {
  const db = getDb();
  const email = input.email.toLowerCase().trim();
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  const user = rows[0];
  if (!user) {
    // dummy verify for timing
    await verifySecret(input.password, "$2a$12$invalidhashinvalidhashinvalidha");
    throw new AuthError("E-Mail oder Passwort ungültig", "INVALID_CREDENTIALS");
  }

  const ok = await verifySecret(input.password, user.passwordHash);
  if (!ok) {
    throw new AuthError("E-Mail oder Passwort ungültig", "INVALID_CREDENTIALS");
  }

  await createSession({ userId: user.id, email: user.email });
  return { id: user.id, email: user.email, name: user.name };
}

export async function logoutUser() {
  await destroySession();
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new AuthError("Nicht angemeldet", "UNAUTHORIZED");

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new AuthError("Nicht angemeldet", "UNAUTHORIZED");
  return rows[0];
}

export async function getOptionalUser() {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

export async function requestPasswordReset(emailRaw: string) {
  const db = getDb();
  const email = emailRaw.toLowerCase().trim();
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  // Always succeed to avoid email enumeration
  if (!rows[0]) {
    return { ok: true as const, resetUrl: null as string | null };
  }

  const token = createRandomToken();
  await db.insert(passwordResetTokens).values({
    userId: rows[0].id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + appConfig.passwordResetTtlSeconds * 1000),
  });

  const resetUrl = `${appConfig.url}/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== "production") {
    console.info("[readlane] password reset:", resetUrl);
  }
  return { ok: true as const, resetUrl: process.env.NODE_ENV === "production" ? null : resetUrl };
}

export async function resetPassword(token: string, newPassword: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, sha256(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AuthError("Ungültiger oder abgelaufener Link", "INVALID_TOKEN");
  }

  const passwordHash = await hashSecret(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));
}

export async function requestMagicLink(emailRaw: string) {
  const db = getDb();
  const email = emailRaw.toLowerCase().trim();
  const token = createRandomToken();
  await db.insert(magicLinkTokens).values({
    email,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + appConfig.magicLinkTtlSeconds * 1000),
  });
  const url = `${appConfig.url}/auth/magic?token=${token}`;
  if (process.env.NODE_ENV !== "production") {
    console.info("[readlane] magic link:", url);
  }
  return { ok: true as const, magicUrl: process.env.NODE_ENV === "production" ? null : url };
}

export async function consumeMagicLink(token: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(magicLinkTokens)
    .where(eq(magicLinkTokens.tokenHash, sha256(token)))
    .limit(1);
  const row = rows[0];
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AuthError("Ungültiger oder abgelaufener Magic Link", "INVALID_TOKEN");
  }

  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, row.id));

  const email = row.email.toLowerCase();
  let userRows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (!userRows[0]) {
    // Create account without known password — random unusable password
    const passwordHash = await hashSecret(createRandomToken(48));
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
      })
      .returning();
    if (!created) throw new AuthError("Konto konnte nicht erstellt werden", "NOT_FOUND");
    userRows = [created];
  }

  const user = userRows[0]!;
  await createSession({ userId: user.id, email: user.email });
  return { id: user.id, email: user.email, name: user.name };
}

export async function changeEmail(userId: string, newEmail: string, password: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new AuthError("Nicht gefunden", "NOT_FOUND");
  const ok = await verifySecret(password, user.passwordHash);
  if (!ok) throw new AuthError("Passwort ungültig", "INVALID_CREDENTIALS");

  const email = newEmail.toLowerCase().trim();
  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  if (taken[0]) throw new AuthError("E-Mail ist bereits vergeben", "EMAIL_TAKEN");

  await db
    .update(users)
    .set({ email, updatedAt: new Date(), emailVerifiedAt: null })
    .where(eq(users.id, userId));

  await createSession({ userId, email });
  return { email };
}

export async function deleteAccount(userId: string, password: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new AuthError("Nicht gefunden", "NOT_FOUND");
  const ok = await verifySecret(password, user.passwordHash);
  if (!ok) throw new AuthError("Passwort ungültig", "INVALID_CREDENTIALS");

  await db
    .update(users)
    .set({ deletedAt: new Date(), email: `deleted+${user.id}@invalid.local`, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await destroySession();
}

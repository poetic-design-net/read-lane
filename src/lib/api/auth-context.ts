/**
 * Unified request auth: session cookie OR Bearer CLI/API token.
 */

import type { NextRequest } from "next/server";
import { getSession } from "@/lib/security/auth-session";
import { authenticateBearer, CliAuthError } from "@/lib/cli/tokens";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type AuthContext = {
  userId: string;
  email: string;
  name: string | null;
  plan: string;
  actorType: "user" | "cli" | "api";
  tokenPublicId?: string;
  deviceName?: string | null;
  /** Bearer tokens only — session auth is always unrestricted. */
  scope?: string;
  tokenProjectId?: string | null;
};

export class ApiAuthError extends Error {
  constructor(
    message = "Nicht angemeldet",
    /** 401 for missing/invalid credentials, 403 when the token may not do this. */
    public status: 401 | 403 = 401
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export async function requireAuth(
  req: NextRequest
): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    try {
      const cli = await authenticateBearer(req);
      const db = getDb();
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          plan: users.plan,
        })
        .from(users)
        .where(and(eq(users.id, cli.userId), isNull(users.deletedAt)))
        .limit(1);
      if (!user) throw new ApiAuthError();
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        actorType: "cli",
        tokenPublicId: cli.tokenPublicId,
        deviceName: cli.deviceName,
        scope: cli.scope,
        tokenProjectId: cli.projectId,
      };
    } catch (e) {
      // A token that exists but may not do this is forbidden, not unauthenticated.
      if (e instanceof CliAuthError && e.code === "FORBIDDEN_SCOPE") {
        throw new ApiAuthError(e.message, 403);
      }
      if (e instanceof CliAuthError) throw new ApiAuthError(e.message);
      throw e;
    }
  }

  const session = await getSession();
  if (!session) throw new ApiAuthError();

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
    })
    .from(users)
    .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) throw new ApiAuthError();
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    actorType: "user",
  };
}

export async function optionalAuth(
  req: NextRequest
): Promise<AuthContext | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

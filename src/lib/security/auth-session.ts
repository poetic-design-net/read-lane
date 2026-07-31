import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";

const COOKIE_NAME = "readlane_session";

export interface SessionUser {
  userId: string;
  email: string;
}

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.DATABASE_URL ??
    "dev-only-insecure-session-secret";
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 64));
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    sub: user.userId,
    email: user.email,
    purpose: "web_session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${appConfig.sessionTtlSeconds}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: appConfig.sessionTtlSeconds,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "web_session" || !payload.sub) return null;
    return {
      userId: String(payload.sub),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Short-lived signed management access for authenticated users. */
export async function createSignedManagementToken(
  documentPublicId: string,
  userId: string
): Promise<string> {
  return new SignJWT({
    publicId: documentPublicId,
    userId,
    purpose: "manage_access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${appConfig.managementUrlTtlSeconds}s`)
    .sign(getSecret());
}

export async function verifySignedManagementToken(
  token: string
): Promise<{ publicId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "manage_access") return null;
    if (!payload.publicId || !payload.userId) return null;
    return {
      publicId: String(payload.publicId),
      userId: String(payload.userId),
    };
  } catch {
    return null;
  }
}

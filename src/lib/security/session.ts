import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";

const COOKIE_PREFIX = "readlane_unlock_";

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ?? process.env.DATABASE_URL ?? "dev-only-secret";
  return new TextEncoder().encode(secret.slice(0, 64).padEnd(32, "0"));
}

function cookieName(publicId: string): string {
  // Sanitize publicId for cookie name (alphanumeric only)
  return `${COOKIE_PREFIX}${publicId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Create a short-lived HTTP-only unlock session for one document.
 */
export async function setUnlockSession(publicId: string): Promise<void> {
  const token = await new SignJWT({ publicId, purpose: "doc_unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${appConfig.unlockSessionTtlSeconds}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(cookieName(publicId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/d/${publicId}`,
    maxAge: appConfig.unlockSessionTtlSeconds,
  });
}

/**
 * Verify unlock session for a document. Returns true if valid.
 */
export async function hasUnlockSession(publicId: string): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get(cookieName(publicId))?.value;
    if (!token) return false;

    const { payload } = await jwtVerify(token, getSecret());
    return (
      payload.publicId === publicId && payload.purpose === "doc_unlock"
    );
  } catch {
    return false;
  }
}

export async function clearUnlockSession(publicId: string): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(publicId));
}

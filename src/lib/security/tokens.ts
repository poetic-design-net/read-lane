import { customAlphabet } from "nanoid";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { appConfig } from "@/lib/config";

const alphabet =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const genPublicId = customAlphabet(alphabet, appConfig.publicIdLength);
const genProjectId = customAlphabet(alphabet, appConfig.projectPublicIdLength);
const genManageToken = customAlphabet(alphabet, appConfig.managementTokenLength);
const genCliToken = customAlphabet(alphabet, appConfig.cliTokenLength);
const genUserCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function createPublicId(): string {
  return genPublicId();
}

export function createProjectPublicId(): string {
  return `prj_${genProjectId()}`;
}

export function createDocumentPublicId(): string {
  return `doc_${genPublicId()}`;
}

/** Share URL id (shorter, no prefix for nicer public links). */
export function createSharePublicId(): string {
  return genPublicId();
}

export function createManagementToken(): string {
  return genManageToken();
}

export function createCliTokenPlain(): string {
  return `rln_${genCliToken()}`;
}

export function createCliTokenPublicId(): string {
  return `tok_${genProjectId()}`;
}

export function createUserCode(): string {
  const code = genUserCode();
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function createDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

export function createRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export async function hashSecret(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, appConfig.bcryptRounds);
}

export async function verifySecret(
  plaintext: string,
  hash: string
): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/** Fast non-bcrypt hash for high-entropy tokens (device codes, CLI tokens lookup). */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export const DUMMY_PASSWORD_HASH =
  "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.K8Y5Y5Y5u";

import { hashSecret, verifySecret } from "./tokens";
import { appConfig } from "@/lib/config";

export async function hashPassword(password: string): Promise<string> {
  if (
    password.length < appConfig.limits.passwordMin ||
    password.length > appConfig.limits.passwordMax
  ) {
    throw new Error("Invalid password length");
  }
  return hashSecret(password);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return false;
  return verifySecret(password, hash);
}

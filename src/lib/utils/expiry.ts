import type { ExpiryPreset } from "@/types/document";

export function resolveExpiresAt(
  preset: ExpiryPreset,
  customDate?: string | null
): Date | null {
  const now = Date.now();
  switch (preset) {
    case "never":
      return null;
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    case "custom": {
      if (!customDate) return null;
      const d = new Date(customDate);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return null;
  }
}

export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

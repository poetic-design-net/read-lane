/**
 * Central plan limits and pricing config (v2).
 * Euro prices live in Stripe Price IDs — never hardcode money here.
 */

export type PlanId = "free" | "pro" | "business";

export const planConfig = {
  free: {
    id: "free" as const,
    name: "Free",
    /** Exactly one active (published) document slot */
    activeDocuments: 1,
    projects: 0,
    passwordProtection: false,
    versionHistory: false,
    customSlugs: false,
    removeBranding: false,
    cliSync: false,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedRenderers: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
    ] as const,
    visibilities: ["public", "unlisted"] as const,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    activeDocuments: Infinity,
    projects: Infinity,
    passwordProtection: true,
    versionHistory: true,
    customSlugs: true,
    removeBranding: true,
    cliSync: true,
    maxFileSizeBytes: 25 * 1024 * 1024,
    allowedRenderers: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
      "docx",
    ] as const,
    visibilities: ["public", "unlisted", "password"] as const,
  },
  business: {
    id: "business" as const,
    name: "Business",
    activeDocuments: Infinity,
    projects: Infinity,
    passwordProtection: true,
    versionHistory: true,
    customSlugs: true,
    removeBranding: true,
    cliSync: true,
    maxFileSizeBytes: 100 * 1024 * 1024,
    allowedRenderers: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
      "docx",
    ] as const,
    visibilities: ["public", "unlisted", "password"] as const,
    teams: true,
  },
} as const;

export type PlanConfig = (typeof planConfig)[PlanId];

/** Stripe price IDs — set via env in production */
export const stripePriceConfig = {
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
  businessMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? "",
  businessYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID ?? "",
};

export function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (
    priceId === stripePriceConfig.businessMonthly ||
    priceId === stripePriceConfig.businessYearly
  ) {
    return "business";
  }
  if (
    priceId === stripePriceConfig.proMonthly ||
    priceId === stripePriceConfig.proYearly
  ) {
    return "pro";
  }
  return "free";
}

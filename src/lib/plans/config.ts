/**
 * Central plan limits (backend.md §7–§9, §14).
 * Money lives only in Stripe Price IDs — never hardcode amounts here.
 */

export type PlanId = "free" | "pro" | "business";

export type RendererType =
  | "markdown"
  | "text"
  | "code"
  | "csv"
  | "html"
  | "pdf"
  | "image"
  | "docx";

export type Entitlements = {
  maxActiveDocuments: number | null;
  maxProjects: number | null;
  maxFileSizeBytes: number;
  maxStorageBytes: number;

  passwordProtection: boolean;
  versionHistory: boolean;
  customSlugs: boolean;
  customDomains: boolean;
  removeBranding: boolean;
  cliSingleDocument: boolean;
  cliProjects: boolean;
  cliPushAll: boolean;
  apiAccess: boolean;
  teamMembers: boolean;

  allowedRendererTypes: RendererType[];
  visibilities: Array<"public" | "unlisted" | "password">;
};

/** null = unlimited */
export const planLimits: Record<PlanId, Entitlements> = {
  free: {
    maxActiveDocuments: 1,
    maxProjects: 0,
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxStorageBytes: 25 * 1024 * 1024,
    passwordProtection: false,
    versionHistory: false,
    customSlugs: false,
    customDomains: false,
    removeBranding: false,
    cliSingleDocument: true,
    cliProjects: false,
    cliPushAll: false,
    apiAccess: false,
    teamMembers: false,
    allowedRendererTypes: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
    ],
    visibilities: ["public", "unlisted"],
  },
  pro: {
    maxActiveDocuments: null,
    maxProjects: null,
    maxFileSizeBytes: 100 * 1024 * 1024,
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    passwordProtection: true,
    versionHistory: true,
    customSlugs: true,
    customDomains: false,
    removeBranding: true,
    cliSingleDocument: true,
    cliProjects: true,
    cliPushAll: true,
    apiAccess: false,
    teamMembers: false,
    allowedRendererTypes: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
      "docx",
    ],
    visibilities: ["public", "unlisted", "password"],
  },
  business: {
    maxActiveDocuments: null,
    maxProjects: null,
    maxFileSizeBytes: 500 * 1024 * 1024,
    maxStorageBytes: 100 * 1024 * 1024 * 1024,
    passwordProtection: true,
    versionHistory: true,
    customSlugs: true,
    customDomains: true,
    removeBranding: true,
    cliSingleDocument: true,
    cliProjects: true,
    cliPushAll: true,
    apiAccess: true,
    teamMembers: true,
    allowedRendererTypes: [
      "markdown",
      "text",
      "code",
      "csv",
      "pdf",
      "image",
      "html",
      "docx",
    ],
    visibilities: ["public", "unlisted", "password"],
  },
};

/** Back-compat alias used by older call sites */
export const planConfig = {
  free: {
    id: "free" as const,
    name: "Free",
    activeDocuments: 1,
    projects: 0,
    passwordProtection: false,
    versionHistory: false,
    customSlugs: false,
    removeBranding: false,
    cliSync: false,
    maxFileSizeBytes: planLimits.free.maxFileSizeBytes,
    allowedRenderers: planLimits.free.allowedRendererTypes,
    visibilities: planLimits.free.visibilities,
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
    maxFileSizeBytes: planLimits.pro.maxFileSizeBytes,
    allowedRenderers: planLimits.pro.allowedRendererTypes,
    visibilities: planLimits.pro.visibilities,
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
    maxFileSizeBytes: planLimits.business.maxFileSizeBytes,
    allowedRenderers: planLimits.business.allowedRendererTypes,
    visibilities: planLimits.business.visibilities,
    teams: true,
  },
} as const;

export type PlanConfig = (typeof planConfig)[PlanId];

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

export function priceIdFor(
  plan: "pro" | "business",
  interval: "monthly" | "yearly"
): string | null {
  if (plan === "business") {
    return interval === "yearly"
      ? stripePriceConfig.businessYearly || null
      : stripePriceConfig.businessMonthly || null;
  }
  return interval === "yearly"
    ? stripePriceConfig.proYearly || null
    : stripePriceConfig.proMonthly || null;
}
